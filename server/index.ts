/**
 * VEXEA Authoritative Full-Stack Game Server (Room-Scoping Refactor)
 * Coordinates and scales matchmaking sessions to allow 100+ parallel, real-time authoritative matches.
 * Enforces Zero-GC, authoritative validation, and server-side LLM loop per room.
 */

import { Sentry } from "./sentry";
import { loadDopplerSecrets } from "./doppler";
import dotenv from "dotenv";
import express from "express";
import http from "http";
import path from "path";
import RAPIER from "@dimforge/rapier3d-compat";
import { createServer as createViteServer } from "vite";

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

import { createTransport, ChannelAdapter } from "./transport/adapter";
export type { ChannelAdapter };
import { connectionRegistry } from "./connection-registry";
import { MatchRoom, PlayerState } from "./MatchRoom";
import { serverFlagService } from "./flags/flag-service";
import { matchmaker } from "./Matchmaker";
import { registerDevCommands } from "./dev/dev-commands";
import { registerMatchmakingHandlers } from "./transport/handlers/matchmaking-handlers";
import { registerGameplayHandlers } from "./transport/handlers/gameplay-handlers";
import { registerSocialHandlers } from "./transport/handlers/social-handlers";
import { registerConnectionHandlers } from "./transport/handlers/connection-handlers";
import { registerApiRoutes } from "./routes/api-routes";
import { IS_DEV } from "../shared/gates/production.gate";

export { IS_DEV }; // Master toggle to easily disable all development cheats/commands on the server for production.

dotenv.config();

export const globalChannels: any[] = [];
export const globalServerLogs: string[] = [];
(global as any).serverLogs = globalServerLogs;
const originalLog = console.log;

console.log = function (...args: any[]) {
  const msg = args.join(" ");
  originalLog.apply(console, args);
  globalServerLogs.push(msg);
  if (globalServerLogs.length > 500) globalServerLogs.shift();
  try {
    for (const c of globalChannels) {
      c.emit("server_debug", msg);
    }
  } catch (e) {}
};

// Firebase Admin SDK will be initialized inside serveApp() after Doppler secrets are loaded

let _dbInstance: any = null;
function getDbInstance() {
  if (!_dbInstance) {
    try {
      _dbInstance = getFirestore();
    } catch (e: any) {
      console.warn(
        "VEXEA Database Notice: Failed to retrieve Firestore instance.",
        e.message || e,
      );
      _dbInstance = new Proxy(
        {},
        {
          get(target, prop) {
            if (prop === "collection") {
              return () => ({
                doc: () => ({
                  set: async () => {},
                  update: async () => {},
                  delete: async () => {},
                }),
                where: () => ({
                  get: async () => ({ size: 0, forEach: () => {} }),
                }),
                get: async () => ({ size: 0, forEach: () => {} }),
              });
            }
            if (prop === "doc") {
              return () => ({
                set: async () => {},
                update: async () => {},
                delete: async () => {},
              });
            }
            if (prop === "runTransaction") {
              return async (fn: any) => {
                const tx = {
                  get: async () => ({ exists: false, data: () => null }),
                  set: () => tx,
                  update: () => tx,
                  delete: () => tx,
                };
                return fn(tx);
              };
            }
            return () => {
              console.warn(
                `[Database Proxy] Operation ${String(prop)} skipped - database connection inactive.`,
              );
              return {
                doc: () => ({
                  set: async () => {},
                  update: async () => {},
                  delete: async () => {},
                }),
                collection: () => ({
                  doc: () => ({
                    set: async () => {},
                    update: async () => {},
                    delete: async () => {},
                  }),
                }),
                where: () => ({
                  get: async () => ({ size: 0, forEach: () => {} }),
                }),
                get: async () => ({ size: 0, forEach: () => {} }),
                set: async () => {},
                update: async () => {},
                delete: async () => {},
              };
            };
          },
        },
      );
    }
  }
  return _dbInstance;
}

export const db: any = new Proxy(
  {},
  {
    get(target, prop) {
      const inst = getDbInstance();
      const val = inst[prop];
      if (typeof val === "function") {
        return val.bind(inst);
      }
      return val;
    },
  },
) as any;

// Mimic firebase client interfaces for Firestore admin helpers
export function doc(database: any, collectionName: string, docId?: string) {
  if (docId) {
    return db.collection(collectionName).doc(docId);
  }
  return db.doc(collectionName);
}

export async function getDoc(docRef: any) {
  const snap = await docRef.get();
  return {
    exists: () => snap.exists,
    data: () => snap.data(),
    ref: snap.ref,
    id: snap.id,
  };
}

export function collection(database: any, collectionName: string) {
  return db.collection(collectionName);
}

export function query(collRef: any, ...constraints: any[]) {
  let q = collRef;
  for (const c of constraints) {
    if (c && typeof c === "function") {
      q = c(q);
    }
  }
  return q;
}

export function where(fieldPath: string, opStr: any, value: any) {
  return (q: any) => q.where(fieldPath, opStr, value);
}

export async function getDocs(q: any) {
  const response = await q.get();
  return response;
}

export function processFirebaseDataForAdmin(data: any): any {
  if (data === null || typeof data !== "object") return data;
  if (data.__isIncrement) {
    return FieldValue.increment(data.value);
  }
  const copy = Array.isArray(data) ? [] : {};
  for (const key of Object.keys(data)) {
    const val = data[key];
    if (val && typeof val === "object" && val.__isIncrement) {
      (copy as any)[key] = FieldValue.increment(val.value);
    } else if (val && typeof val === "object") {
      (copy as any)[key] = processFirebaseDataForAdmin(val);
    } else {
      (copy as any)[key] = val;
    }
  }
  return copy;
}

export async function setDoc(docRef: any, data: any, options?: any) {
  const cleanData = processFirebaseDataForAdmin(data);
  return docRef.set(cleanData, options);
}

export async function deleteDoc(docRef: any) {
  return docRef.delete();
}

export async function updateDoc(docRef: any, data: any) {
  const cleanData = processFirebaseDataForAdmin(data);
  return docRef.update(cleanData);
}

export function increment(n: number) {
  return { __isIncrement: true, value: n };
}

export async function runTransaction(
  database: any,
  updateFunction: (transaction: any) => Promise<any>,
) {
  return db.runTransaction(async (adminTx) => {
    const wrappedTx = {
      get: async (docRef: any) => {
        const snap = (await adminTx.get(docRef)) as any;
        return {
          exists: () => snap.exists,
          data: () => snap.data(),
          ref: snap.ref,
        };
      },
      set: (docRef: any, data: any) => {
        const cleanData = processFirebaseDataForAdmin(data);
        adminTx.set(docRef, cleanData);
        return wrappedTx;
      },
      update: (docRef: any, data: any) => {
        const cleanData = processFirebaseDataForAdmin(data);
        adminTx.update(docRef, cleanData);
        return wrappedTx;
      },
      delete: (docRef: any) => {
        adminTx.delete(docRef);
        return wrappedTx;
      },
    };
    return updateFunction(wrappedTx);
  });
}

// Garbage Collector for MatchInProgress sessions
setInterval(
  async () => {
    try {
      const q = query(
        collection(db, "MatchInProgress"),
        where("startTime", "<", Date.now() - 2 * 60 * 60 * 1000),
      );
      const snapshot = await getDocs(q);
      snapshot.forEach(async (docSnap) => {
        const data = docSnap.data();
        if (data.playerId) {
          try {
            const userRef = doc(db, "Users", data.playerId);
            await updateDoc(userRef, { score: increment(-50) });
          } catch (e) {}
        }
        await deleteDoc(docSnap.ref);
      });
    } catch (e) {}
  },
  30 * 60 * 1000,
);

// Create Express and HTTP Server
const app = express();
const server = http.createServer(app);
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  res.setHeader("Document-Policy", "js-profiling");
  next();
});

// Configure general global CORS middleware for decoupled client-server hosting environments
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Origin, Accept",
  );
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

const PORT = (process.env.NODE_ENV === "production" && process.env.PORT) ? parseInt(process.env.PORT, 10) : 3000;
const io = createTransport();

app.use(express.json({ limit: "10mb" }));

// Register Express API Routes
registerApiRoutes(app);

io.onConnection((channel: ChannelAdapter) => {
  globalChannels.push(channel);
  const playerId = `PL_${Math.floor(Math.random() * 100000)}`;

  // Send initial configuration to client
  channel.emit("session_init", {
    playerId,
    serverTime: Date.now(),
    config: {
      gameVersion: "0.1.0",
      environment: process.env.NODE_ENV || "development",
    },
  });

  let currentRoom: MatchRoom | null = null;
  let pState: PlayerState | null = null;
  connectionRegistry.register(playerId, channel);

  const getRoom = (): MatchRoom | null => currentRoom || (channel as any).currentRoom || null;
  const getPlayer = (): PlayerState | null => pState || (channel as any).pState || null;

  registerDevCommands(
    channel,
    db,
    getRoom,
    getPlayer,
  );

  registerMatchmakingHandlers(
    channel,
    playerId,
    getRoom,
    getPlayer,
    matchmaker,
    connectionRegistry,
  );

  registerGameplayHandlers(
    channel,
    playerId,
    getRoom,
    getPlayer,
  );

  registerSocialHandlers(
    channel,
    playerId,
    getRoom,
    getPlayer,
  );

  registerConnectionHandlers(
    channel,
    playerId,
    getRoom,
    getPlayer,
    db,
    doc,
    updateDoc,
  );

  channel.onDisconnect(() => {
    matchmaker.removePlayerFromPool(playerId);
    connectionRegistry.unregister(playerId);
    const room = getRoom();
    const p = getPlayer();
    if (p && room) {
      const pid = p.id;
      console.log(`Disconnection registered: ${pid}. Waiting 10s for reconnection...`);

      setTimeout(() => {
        const pCheck = room.players.get(pid);
        if (pCheck && !pCheck.channel.connected) {
          console.log(`[MATCH] Reconnection timeout expired for player ${pid}. Removing.`);
          room.removePlayer(pid);
        }
      }, 10000);
    }
    const idx = globalChannels.indexOf(channel);
    if (idx !== -1) globalChannels.splice(idx, 1);
  });
});

const serveApp = async () => {
  // Load production secrets from Doppler if DOPPLER_TOKEN is provided
  await loadDopplerSecrets();

  // Initialize Firebase Admin SDK after Doppler secrets are loaded
  let serviceAccount: any = null;
  const envSecret = process.env["FIREBASE_SERVICE_ACCOUNT"];
  console.log(`[FIREBASE DIAGNOSTIC] FIREBASE_SERVICE_ACCOUNT env is ${envSecret ? "PRESENT (length: " + envSecret.length + ")" : "MISSING"}`);

  try {
    if (envSecret) {
      serviceAccount = JSON.parse(envSecret);
      console.log(`[FIREBASE DIAGNOSTIC] Successfully parsed service account JSON. Project ID: "${serviceAccount?.project_id}", Client Email: "${serviceAccount?.client_email}"`);
    }
  } catch (e: any) {
    console.error(
      "VEXEA Server Notice: Could not parse service account from environment:",
      e.message || e,
    );
  }

  if (serviceAccount) {
    try {
      if (getApps().length === 0) {
        initializeApp({
          credential: cert(serviceAccount),
        });
        console.log(
          `VEXEA Authoritative Database Server: Firebase initialized with administrative credentials for project "${serviceAccount?.project_id || "unknown"}".`,
        );
      }
    } catch (err: any) {
      console.error(
        "VEXEA Authoritative Database Server: Admin initialization failed, falling back:",
        err,
      );
      if (getApps().length === 0) initializeApp();
    }
  } else {
    try {
      if (getApps().length === 0) {
        initializeApp();
        console.log(
          "VEXEA Authoritative Database Server: Firebase initialized with default environment profile.",
        );
      }
    } catch (err) {}
  }

  await serverFlagService.initialize();

  // Setup Rapier globally once before room allocation
  await RAPIER.init();

  // Start listening for incoming network transport only after Rapier is fully ready
  if (!process.env.TEST_MODE) io.listen(PORT, server);

  app.use("/shared", express.static(path.join(process.cwd(), "shared")));

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.get("/", (req, res) => {
      res.json({ status: "online", service: "Vexea Game Server" });
    });
  }

  if (!process.env.TEST_MODE) server.listen(PORT, "0.0.0.0", () => {
    console.log(
      `[VEXEA SERVER CORE] Authoritative Room-Scoping engine listening on Port ${PORT}`,
    );
  });
};

serveApp();
