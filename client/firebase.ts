/**
 * VEXEA Client Firebase Integration Manager
 * Implements lazy initialization and robust failure bypass, conforming to the Firestore-Integration skill.
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getFirestore,
  Firestore
} from "firebase/firestore";
import {
  getAuth,
  signInAnonymously,
  linkWithCredential,
  EmailAuthProvider,
  signInWithEmailAndPassword,
  Auth
} from "firebase/auth";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getAnalytics, Analytics, logEvent, isSupported } from "firebase/analytics";
import type { Database } from "firebase/database";

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export let db: Firestore | null = null;
export let auth: Auth | null = null;
export let storage: FirebaseStorage | null = null;
export let rtdb: Database | null = null;
export let analytics: Analytics | null = null;
export let isFirebaseReady = false;

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const currentUserId = auth?.currentUser?.uid;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUserId || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

import firebaseConfig from "../firebase-applet-config.json";

export async function initFirebase(): Promise<boolean> {
  if (isFirebaseReady) return true;
  try {
    const { initializeApp } = await import("firebase/app");
    const { getDatabase } = await import("firebase/database");
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    auth = getAuth(app);
    storage = getStorage(app);
    try {
      if (await isSupported()) {
        analytics = getAnalytics(app);
        console.log("Firebase Analytics initialized successfully with measurement ID:", firebaseConfig.measurementId);
        logEvent(analytics, "analytics_init", {
          timestamp: new Date().toISOString(),
          measurementId: firebaseConfig.measurementId
        });
      } else {
        console.log("Firebase Analytics is not supported in this environment.");
      }
    } catch (analyticsErr) {
      console.warn("Failed to initialize Firebase Analytics:", analyticsErr);
    }
    try {
      rtdb = getDatabase(app);
    } catch {
      const dbUrl = (firebaseConfig as any).databaseURL || `https://${firebaseConfig.projectId}-default-rtdb.firebaseio.com`;
      rtdb = getDatabase(app, dbUrl);
    }
    isFirebaseReady = true;
    console.log("Firebase initialized successfully with configuration credentials.");
    return true;
  } catch (err) {
    console.warn("VEXEA Database Notice: Missing firebase-applet-config.json. Running in local sandbox.");
    isFirebaseReady = false;
    return false;
  }
}

export async function authenticateAnonymously(): Promise<string | null> {
  if (!isFirebaseReady || !auth) return null;
  try {
    if (auth.currentUser) {
      return auth.currentUser.uid;
    }
    const userCredential = await signInAnonymously(auth);
    return userCredential.user.uid;
  } catch (error) {
    console.error("Firebase Anonymous Auth failed:", error);
    return null;
  }
}

export async function linkAnonymousAccount(
  email: string,
  password: string
): Promise<{ success: boolean; uid: string | null; error: string | null }> {
  if (!auth || !auth.currentUser || auth.currentUser.isAnonymous === false) {
    const res = { success: false, uid: null, error: "No anonymous session to link" };
    console.log("[Account Link Attempt] Check failed: No anonymous user active.", {
      authInitialized: !!auth,
      hasUser: !!auth?.currentUser,
      isAnonymous: auth?.currentUser?.isAnonymous ?? null
    });
    console.log("[Account Link Result]", res);
    return res;
  }

  const currentUser = auth.currentUser;
  console.log("[Account Link Attempt] Linking anonymous UID:", currentUser.uid, "with email:", email);
  try {
    const credential = EmailAuthProvider.credential(email, password);
    const result = await linkWithCredential(currentUser, credential);
    const res = { success: true, uid: result.user.uid, error: null };
    console.log("[Account Link Result]", res);
    return res;
  } catch (error: any) {
    const errorMsg = error?.message ? String(error.message) : "Unknown link error";
    const res = { success: false, uid: null, error: errorMsg };
    console.log("[Account Link Result]", res);
    return res;
  }
}

export async function signInWithLinkedAccount(
  email: string,
  password: string
): Promise<{ success: boolean; uid: string | null; error: string | null }> {
  if (!auth) {
    const res = { success: false, uid: null, error: "Firebase Auth not initialized" };
    console.log("[Sign-In Attempt] Check failed: Auth not initialized for email:", email);
    console.log("[Sign-In Result]", res);
    return res;
  }

  console.log("[Sign-In Attempt] Signing in with linked account for email:", email);
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const res = { success: true, uid: userCredential.user.uid, error: null };
    console.log("[Sign-In Result]", res);
    return res;
  } catch (error: any) {
    const errorMsg = error?.message ? String(error.message) : "Unknown sign-in error";
    const res = { success: false, uid: null, error: errorMsg };
    console.log("[Sign-In Result]", res);
    return res;
  }
}

export interface PlayerCloudStats {
  playedCount: number;
  highScore: number;
  xp: number;
  updatedAt: string;
}

export async function fetchPlayerStats(playerId: string): Promise<PlayerCloudStats | null> {
  if (!isFirebaseReady || !db) return null;
  const pathStr = `player_stats/${playerId}`;
  try {
    const docRef = doc(db, "player_stats", playerId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as PlayerCloudStats;
    } else {
      // Create initial stats document
      const initialStats: PlayerCloudStats = {
        playedCount: 0,
        highScore: 0,
        xp: 0,
        updatedAt: new Date().toISOString()
      };
      await setDoc(docRef, initialStats);
      return initialStats;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, pathStr);
    return null;
  }
}

export async function savePlayerStats(playerId: string, matchesPlayed: number, high: number, points: number): Promise<boolean> {
  if (!isFirebaseReady || !db) return false;
  const pathStr = `player_stats/${playerId}`;
  try {
    const docRef = doc(db, "player_stats", playerId);
    const updated: PlayerCloudStats = {
      playedCount: matchesPlayed,
      highScore: high,
      xp: points,
      updatedAt: new Date().toISOString()
    };
    await setDoc(docRef, updated);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, pathStr);
    return false;
  }
}

export async function lockMatchSession(matchId: string, playerId: string): Promise<boolean> {
  try {
    const res = await fetch("/api/match/lock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, playerId })
    });
    const data = await res.json();
    return !!data.success;
  } catch (error) {
    console.error("[MatchLock] Failed to lock match session:", error);
    return false;
  }
}

export async function unlockMatchSession(matchId: string): Promise<boolean> {
  try {
    const res = await fetch("/api/match/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId })
    });
    const data = await res.json();
    return !!data.success;
  } catch (error) {
    console.error("[MatchLock] Failed to unlock match session:", error);
    return false;
  }
}

export async function testStorageUpload(): Promise<boolean> {
  if (!isFirebaseReady || !storage) return false;
  try {
    const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
    const testRef = ref(storage, 'test_upload.txt');
    const blob = new Blob(['Firebase Storage is working!'], { type: 'text/plain' });
    await uploadBytes(testRef, blob);
    const url = await getDownloadURL(testRef);
    console.log("Firebase Storage test upload successful. URL:", url);
    return true;
  } catch (error) {
    console.error("Firebase Storage test upload failed:", error);
    return false;
  }
}
