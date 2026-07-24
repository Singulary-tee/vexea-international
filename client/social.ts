/**
 * VEXEA Social & Presence Module
 * Implements Firestore Friends Graph and Realtime Database Presence Management
 */

import {
  doc,
  getDocs,
  collection,
  writeBatch,
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
    const senderRef = doc(db, "Users", myUid, "friends", targetUid);
    const targetRef = doc(db, "Users", targetUid, "friends", myUid);

    batch.set(senderRef, {
      status: "pending_sent",
      createdAt: serverTimestamp()
    });

    batch.set(targetRef, {
      status: "pending_received",
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
    const myRef = doc(db, "Users", myUid, "friends", requesterUid);
    const requesterRef = doc(db, "Users", requesterUid, "friends", myUid);

    if (accept) {
      batch.set(myRef, { status: "accepted", updatedAt: serverTimestamp() }, { merge: true });
      batch.set(requesterRef, { status: "accepted", updatedAt: serverTimestamp() }, { merge: true });
    } else {
      batch.delete(myRef);
      batch.delete(requesterRef);
    }

    await batch.commit();
    return { success: true, error: null };
  } catch (error: any) {
    const errorMsg = error?.message ? String(error.message) : "Failed to respond to friend request";
    console.error("Error in respondToFriendRequest:", error);
    return { success: false, error: errorMsg };
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
  if (!IS_DEV) return;
  console.log("[DEV_TEST_SOCIAL] Beginning social dev verification run...");

  const senderUid = activeUid || "test_sender_uid_1001";
  const targetUid = "test_target_uid_2002";

  // 1. Send friend request
  const sendRes = await sendFriendRequest(senderUid, targetUid);
  console.log("[DEV_TEST_FRIENDS_SEND_RES]", sendRes);

  // 2. Read back friends list from Firestore
  const friendsListResult = await getFriendsList(senderUid);
  console.log("[DEV_TEST_FRIENDS_FIRESTORE_DATA]", JSON.stringify(friendsListResult, null, 2));

  // 3. Init presence & read back presence object from RTDB
  initPresence(senderUid);
  await new Promise((resolve) => setTimeout(resolve, 600));
  const presenceData = await getPresence(senderUid);
  console.log("[DEV_TEST_PRESENCE_RTDB_DATA]", JSON.stringify(presenceData, null, 2));

  console.log("[DEV_TEST_SOCIAL] Social dev verification run complete.");
}
