/**
 * VEXEA Social & Presence Module
 * Implements Firestore Friends Graph and Realtime Database Presence Management
 */

import {
  doc,
  getDoc,
  getDocs,
  collection,
  writeBatch,
  deleteDoc,
  serverTimestamp,
  runTransaction,
  setDoc
} from "firebase/firestore";
import {
  ref as rtdbRef,
  set as rtdbSet,
  get as rtdbGet,
  onDisconnect,
  serverTimestamp as rtdbServerTimestamp
} from "firebase/database";
import { db, rtdb } from "./firebase";
import { IS_DEV } from "../shared/gates/production.gate";

/**
 * PART 1 — Friends (Firestore)
 */

/**
 * Sends a friend request.
 * - Writes Users/{myUid}/friends/{targetUid} -> { status: 'pending_sent' }
 * - Writes incomingRequests/{targetUid}/requests/{myUid} -> { senderUid: myUid }
 * Does NOT write to targetUid's friends subcollection.
 */
export async function sendFriendRequest(
  myUid: string,
  targetUid: string
): Promise<{ success: boolean; error: string | null }> {
  if (!myUid || !targetUid) {
    return { success: false, error: "Invalid user IDs provided" };
  }
  if (myUid === targetUid) {
    return { success: false, error: "Cannot send friend request to yourself" };
  }
  if (!db) {
    return { success: false, error: "Firestore database not initialized" };
  }

  try {
    const batch = writeBatch(db);
    
    // 1. Own friends subcollection entry
    const myFriendRef = doc(db, "Users", myUid, "friends", targetUid);
    batch.set(myFriendRef, {
      status: "pending_sent",
      createdAt: serverTimestamp()
    });

    // 2. Incoming requests inbox entry in target's namespace
    const incomingRef = doc(db, "incomingRequests", targetUid, "requests", myUid);
    batch.set(incomingRef, {
      senderUid: myUid,
      createdAt: serverTimestamp()
    });

    await batch.commit();
    return { success: true, error: null };
  } catch (error: any) {
    const errorMsg = error?.message ? String(error.message) : "Failed to send friend request";
    console.error("Error in sendFriendRequest:", error);
    return { success: false, error: errorMsg };
  }
}

/**
 * Responds to a friend request.
 * On Accept:
 *   - Writes Users/{myUid}/friends/{requesterUid} -> { status: 'accepted' }
 *   - Writes outcomes/{requesterUid}/notifications/{myUid} -> { status: 'accepted', from: myUid }
 *   - Deletes incomingRequests/{myUid}/requests/{requesterUid}
 * On Decline:
 *   - Deletes incomingRequests/{myUid}/requests/{requesterUid}
 */
export async function respondToFriendRequest(
  myUid: string,
  requesterUid: string,
  accept: boolean
): Promise<{ success: boolean; error: string | null }> {
  if (!myUid || !requesterUid) {
    return { success: false, error: "Invalid user IDs provided" };
  }
  if (!db) {
    return { success: false, error: "Firestore database not initialized" };
  }

  try {
    const batch = writeBatch(db);
    const incomingRef = doc(db, "incomingRequests", myUid, "requests", requesterUid);

    if (accept) {
      // 1. Recipient's own friends entry
      const myFriendRef = doc(db, "Users", myUid, "friends", requesterUid);
      batch.set(myFriendRef, { status: "accepted", createdAt: serverTimestamp() }, { merge: true });

      // 2. Notification in requester's outcome inbox
      const outcomeRef = doc(db, "outcomes", requesterUid, "notifications", myUid);
      batch.set(outcomeRef, {
        status: "accepted",
        from: myUid,
        createdAt: serverTimestamp()
      });

      // 3. Clear incoming request
      batch.delete(incomingRef);
    } else {
      // Decline: clear incoming request only
      batch.delete(incomingRef);
    }

    await batch.commit();
    return { success: true, error: null };
  } catch (error: any) {
    const errorMsg = error?.message ? String(error.message) : "Failed to respond to friend request";
    console.error("Error in respondToFriendRequest:", error);
    return { success: false, error: errorMsg };
  }
}

/**
 * Syncs pending_sent entries by processing the caller's outcome notifications inbox (outcomes/{myUid}/notifications).
 * For each notification, updates Users/{myUid}/friends/{from} to 'accepted', then deletes the notification.
 */
export async function syncPendingSentStatus(myUid: string): Promise<void> {
  if (!myUid || !db) return;

  try {
    const notificationsCol = collection(db, "outcomes", myUid, "notifications");
    const snap = await getDocs(notificationsCol);

    if (snap.empty) return;

    const batch = writeBatch(db);
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const fromUid = data.from || docSnap.id;
      if (data.status === "accepted") {
        const myFriendRef = doc(db, "Users", myUid, "friends", fromUid);
        batch.set(myFriendRef, { status: "accepted", updatedAt: serverTimestamp() }, { merge: true });
        
        const notifRef = doc(db, "outcomes", myUid, "notifications", docSnap.id);
        batch.delete(notifRef);
      }
    });

    await batch.commit();
  } catch (error) {
    console.error("Error in syncPendingSentStatus:", error);
  }
}

export async function getFriendsList(
  myUid: string
): Promise<Array<{ uid: string; status: string; [key: string]: any }>> {
  if (!myUid || !db) return [];

  try {
    const colRef = collection(db, "Users", myUid, "friends");
    const snap = await getDocs(colRef);
    const list: Array<{ uid: string; status: string; [key: string]: any }> = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        uid: docSnap.id,
        status: data.status,
        ...data
      });
    });
    return list;
  } catch (error) {
    console.error("Error in getFriendsList:", error);
    return [];
  }
}

/**
 * Reads all incoming friend requests for a user from incomingRequests/{myUid}/requests.
 */
export async function getIncomingRequests(
  myUid: string
): Promise<Array<{ senderUid: string; createdAt: any }>> {
  if (!myUid || !db) return [];

  try {
    const colRef = collection(db, "incomingRequests", myUid, "requests");
    const snap = await getDocs(colRef);
    const list: Array<{ senderUid: string; createdAt: any }> = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        senderUid: data.senderUid || docSnap.id,
        createdAt: data.createdAt ?? null
      });
    });
    return list;
  } catch (error) {
    console.error("Error in getIncomingRequests:", error);
    return [];
  }
}

/**
 * Claims a unique display name for a user.
 * Validation (checked in order):
 * 1. rawName length 3-20 characters -> 'Name must be 3-20 characters'
 * 2. rawName matches /^[a-zA-Z0-9_]+$/ -> 'Name may only contain letters, numbers, and underscores'
 * 3. Normalize to lowercase key = rawName.toLowerCase()
 * 
 * Check Users/{myUid}.displayName first (outside transaction). If present -> 'You have already claimed a display name'.
 * Transaction (runTransaction): Read usernames/{key}.
 * - If exists -> abort & return 'Name already taken'
 * - If not exists -> write usernames/{key} as {uid: myUid, displayName: rawName} AND write Users/{myUid} merge {displayName: rawName}.
 */
export async function claimDisplayName(
  myUid: string,
  rawName: string
): Promise<{ success: boolean; error: string | null }> {
  if (!myUid) {
    return { success: false, error: "Invalid user ID provided" };
  }
  if (!db) {
    return { success: false, error: "Firestore database not initialized" };
  }

  // 1. Length validation (3-20 characters)
  if (!rawName || rawName.length < 3 || rawName.length > 20) {
    return { success: false, error: "Name must be 3-20 characters" };
  }

  // 2. Character validation
  if (!/^[a-zA-Z0-9_]+$/.test(rawName)) {
    return { success: false, error: "Name may only contain letters, numbers, and underscores" };
  }

  // 3. Lowercase storage key
  const key = rawName.toLowerCase();

  try {
    // Pre-transaction check: check if user already claimed a display name
    const userRef = doc(db, "Users", myUid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists() && userSnap.data()?.displayName) {
      return { success: false, error: "You have already claimed a display name" };
    }

    // Run Firestore transaction
    await runTransaction(db, async (transaction) => {
      const usernameRef = doc(db, "usernames", key);
      const usernameSnap = await transaction.get(usernameRef);
      if (usernameSnap.exists()) {
        throw new Error("Name already taken");
      }

      transaction.set(usernameRef, {
        uid: myUid,
        displayName: rawName
      });

      transaction.set(
        userRef,
        { displayName: rawName },
        { merge: true }
      );
    });

    return { success: true, error: null };
  } catch (error: any) {
    const errorMsg = error?.message === "Name already taken"
      ? "Name already taken"
      : (error?.message || "Failed to claim display name");
    return { success: false, error: errorMsg };
  }
}

/**
 * Ensures the usernames/{key} index document exists for a user's display name.
 * Called automatically when an account is created, enlisted, or loaded.
 */
export async function ensureUsernameMapped(
  myUid: string,
  rawName: string
): Promise<boolean> {
  if (!myUid || !rawName || !db) return false;
  const sanitized = rawName.trim();
  const key = sanitized.toLowerCase();
  if (!key || key.length < 3 || key.length > 20) return false;
  if (!/^[a-zA-Z0-9_]+$/.test(sanitized)) return false;

  try {
    const usernameRef = doc(db, "usernames", key);
    const snap = await getDoc(usernameRef);
    if (!snap.exists()) {
      await setDoc(usernameRef, {
        uid: myUid,
        displayName: sanitized
      });
      return true;
    }
  } catch (err) {
    console.warn("Failed to map username in usernames collection:", err);
  }
  return false;
}

/**
 * Resolves a display name to a user UID.
 * Lowercases input, reads usernames/{key} directly via single getDoc.
 */
export async function resolveDisplayName(
  rawName: string
): Promise<{ uid: string | null; error: string | null }> {
  if (!rawName || !rawName.trim()) {
    return { uid: null, error: "No user found with that name" };
  }
  if (!db) {
    return { uid: null, error: "Firestore database not initialized" };
  }

  const key = rawName.trim().toLowerCase();

  try {
    const usernameRef = doc(db, "usernames", key);
    const docSnap = await getDoc(usernameRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return { uid: data?.uid || null, error: null };
    } else {
      return { uid: null, error: "No user found with that name" };
    }
  } catch (error: any) {
    console.error("Error in resolveDisplayName:", error);
    return { uid: null, error: "No user found with that name" };
  }
}

/**
 * PART 2 — Presence (Realtime Database)
 */

export function initPresence(myUid: string): void {
  if (!rtdb || !myUid) {
    console.warn("initPresence skipped: RTDB or myUid not ready.");
    return;
  }

  try {
    const presenceRef = rtdbRef(rtdb, `presence/${myUid}`);

    // Native onDisconnect handler automatically sets offline on tab close / network drop
    onDisconnect(presenceRef).set({
      status: "offline",
      lastSeen: rtdbServerTimestamp()
    });

    rtdbSet(presenceRef, {
      status: "online",
      lastSeen: rtdbServerTimestamp()
    });
  } catch (error) {
    console.error("Error in initPresence:", error);
  }
}

export async function getPresence(uid: string): Promise<any> {
  if (!rtdb || !uid) return null;
  try {
    const presenceRef = rtdbRef(rtdb, `presence/${uid}`);
    const snap = await rtdbGet(presenceRef);
    return snap.exists() ? snap.val() : null;
  } catch (error) {
    console.error("Error in getPresence:", error);
    return null;
  }
}

/* =========================================================================
 * LOBBY INVITES (PART 2)
 * ========================================================================= */

export interface LobbyInvite {
  id: string;
  lobbyId: string;
  fromUid: string;
  fromName: string;
  createdAt: any;
}

/**
 * Sends a lobby invite to a friend.
 * Writes to lobbyInvites/{invitedUid}/pending/{lobbyId}
 * Payload: { fromUid, fromName, lobbyId, createdAt: serverTimestamp() }
 */
export async function sendLobbyInvite(
  myUid: string,
  myName: string,
  invitedUid: string,
  lobbyId: string
): Promise<{ success: boolean; error: string | null }> {
  if (!db || !myUid || !invitedUid || !lobbyId) {
    return { success: false, error: "Invalid parameters or database offline" };
  }
  try {
    const inviteRef = doc(db, "lobbyInvites", invitedUid, "pending", lobbyId);
    await setDoc(inviteRef, {
      fromUid: myUid,
      fromName: myName || "Agent",
      lobbyId: lobbyId,
      createdAt: serverTimestamp()
    });
    return { success: true, error: null };
  } catch (err: any) {
    console.error("Error in sendLobbyInvite:", err);
    return { success: false, error: err.message || "Failed to send lobby invite" };
  }
}

/**
 * Queries incoming lobby invites for myUid at lobbyInvites/{myUid}/pending.
 * Performs read-time expiration check: if createdAt is older than 5 minutes,
 * asynchronously deletes the invite and excludes it from the returned list.
 */
export async function getLobbyInvites(myUid: string): Promise<LobbyInvite[]> {
  if (!db || !myUid) return [];
  try {
    const collRef = collection(db, "lobbyInvites", myUid, "pending");
    const snap = await getDocs(collRef);
    const results: LobbyInvite[] = [];
    const nowMs = Date.now();
    const FIVE_MIN_MS = 5 * 60 * 1000;

    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      let createdMs = nowMs;
      if (data.createdAt?.toMillis) {
        createdMs = data.createdAt.toMillis();
      } else if (data.createdAt?.seconds) {
        createdMs = data.createdAt.seconds * 1000;
      }

      if (nowMs - createdMs > FIVE_MIN_MS) {
        deleteDoc(docSnap.ref).catch((e) =>
          console.warn("Failed to delete expired lobby invite:", e)
        );
      } else {
        results.push({
          id: docSnap.id,
          lobbyId: data.lobbyId || docSnap.id,
          fromUid: data.fromUid || "",
          fromName: data.fromName || "Unknown Player",
          createdAt: data.createdAt
        });
      }
    }
    return results;
  } catch (err) {
    console.error("Error in getLobbyInvites:", err);
    return [];
  }
}

/**
 * Responds to a lobby invite.
 * - Deletes the document from lobbyInvites/{invitedUid}/pending/{lobbyId}.
 * - If accept is true, joins the lobby via joinLobby(lobbyId).
 */
export async function respondToLobbyInvite(
  invitedUid: string,
  lobbyId: string,
  accept: boolean
): Promise<{ success: boolean; error: string | null }> {
  if (!db || !invitedUid || !lobbyId) {
    return { success: false, error: "Invalid parameters" };
  }
  try {
    const inviteRef = doc(db, "lobbyInvites", invitedUid, "pending", lobbyId);
    await deleteDoc(inviteRef);

    if (accept) {
      await joinLobby(lobbyId);
    }
    return { success: true, error: null };
  } catch (err: any) {
    console.error("Error in respondToLobbyInvite:", err);
    return { success: false, error: err.message || "Failed to process lobby invite" };
  }
}

/**
 * Cancels or cleans up lobby invites for a given lobbyId.
 * Used when a lobby host/member leaves or when match starts.
 */
export async function cancelLobbyInvites(myUid: string, lobbyId: string, invitedUids?: string[]): Promise<void> {
  if (!db || !myUid || !lobbyId) return;
  try {
    if (invitedUids && invitedUids.length > 0) {
      const batch = writeBatch(db);
      for (const targetUid of invitedUids) {
        const inviteRef = doc(db, "lobbyInvites", targetUid, "pending", lobbyId);
        batch.delete(inviteRef);
      }
      await batch.commit();
    }
  } catch (err) {
    console.warn("Error in cancelLobbyInvites:", err);
  }
}

/**
 * Joins a lobby by setting current lobby ID state and transitioning to the lobby screen.
 */
export async function joinLobby(lobbyId: string): Promise<{ success: boolean; error?: string }> {
  if (!lobbyId) return { success: false, error: "Invalid lobby ID" };
  (window as any).vexLobbyId = lobbyId;
  const { showLobby } = await import("./screens/screen-manager");
  showLobby();
  return { success: true };
}

/* =========================================================================
 * TEMPORARY DEV VERIFICATION BLOCK (EASY TO FIND AND DELETE)
 * Runs automatically on app load in dev mode only.
 * ========================================================================= */
export async function runSocialDevVerification(activeUid: string): Promise<void> {
  if (!IS_DEV || !db || !activeUid) return;
  console.log("[DEV_TEST_SOCIAL] Beginning social dev verification run for activeUid:", activeUid);

  const targetUid = "test_target_uid_2002";
  const testRequesterUid = "test_requester_uid_1001";

  // 1. Sender flow: activeUid sends friend request to targetUid
  const sendRes = await sendFriendRequest(activeUid, targetUid);
  console.log("[DEV_TEST_FRIENDS_SEND_RES]", sendRes);

  // Read back activeUid's own friends doc
  const senderFriendDoc = await getDoc(doc(db, "Users", activeUid, "friends", targetUid));
  console.log("[DEV_TEST_SENDER_FRIEND_DOC]", senderFriendDoc.exists() ? senderFriendDoc.data() : null);

  // 2. Recipient flow: activeUid accepts request from testRequesterUid
  const acceptRes = await respondToFriendRequest(activeUid, testRequesterUid, true);
  console.log("[DEV_TEST_FRIENDS_ACCEPT_RES]", acceptRes);

  // Read back activeUid's own accepted friend doc
  const activeAcceptedDoc = await getDoc(doc(db, "Users", activeUid, "friends", testRequesterUid));
  console.log("[DEV_TEST_ACTIVE_ACCEPTED_FRIEND_DOC]", activeAcceptedDoc.exists() ? activeAcceptedDoc.data() : null);

  // 3. Sync pending sent status for activeUid (processes outcomes/{activeUid}/notifications)
  await syncPendingSentStatus(activeUid);

  // Read back activeUid's full friends list
  const friendsListResult = await getFriendsList(activeUid);
  console.log("[DEV_TEST_FRIENDS_FIRESTORE_LIST]", JSON.stringify(friendsListResult, null, 2));

  // 4. Init presence & read back presence object from RTDB for activeUid
  initPresence(activeUid);
  await new Promise((resolve) => setTimeout(resolve, 600));
  const presenceData = await getPresence(activeUid);
  console.log("[DEV_TEST_PRESENCE_RTDB_DATA]", JSON.stringify(presenceData, null, 2));

  console.log("[DEV_TEST_SOCIAL] Social dev verification run complete.");
}
