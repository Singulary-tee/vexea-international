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
  serverTimestamp
} from "firebase/firestore";
import {
  ref as rtdbRef,
  set as rtdbSet,
  get as rtdbGet,
  onDisconnect,
  serverTimestamp as rtdbServerTimestamp
} from "firebase/database";
import { db, rtdb } from "./firebase";
import { IS_DEV } from "../shared/gate";

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
