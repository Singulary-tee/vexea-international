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
import { serverEconomyService } from "./data/economy-service";
import { matchManager } from "./MatchManager";
import { matchmaker } from "./Matchmaker";
import { processHitscan } from "./combat/hitscan";
import { registerDevCommands } from "./dev/dev-commands";
import { CLASSES, ClassId } from "../shared/classes.js";
import {
  ZONES,
  DroneType,
  DroneState,
  WEAPONS,
  DRONE_CONFIGS,
  HISTORICAL_SAMPLES_MAX,
  HISTORIC_BLOCK_SIZE,
} from "../shared/constants";
import {
  DETAILED_WEAPONS,
} from "../shared/weapons";
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

export async function setDoc(docRef: any, data: any) {
  const cleanData = processFirebaseDataForAdmin(data);
  return docRef.set(cleanData);
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

app.use(express.json({limit: '10mb'}));

app.get("/api/health", (req, res) => {
  res.status(200).send("OK");
});

app.get("/api/debug-sentry", (req, res) => {
  // Intentional error test snippet
  (global as any).myUndefinedFunction();
  res.send("Triggered Sentry test error");
});

app.post("/api/log", (req, res) => {
    console.log("[CLIENT LOG]", ...req.body);
    res.sendStatus(200);
});

app.get("/api/logs", (req, res) => {
    res.json((global as any).serverLogs || []);
});

app.get("/api/doppler-client-secrets", async (req, res) => {
  const token =
    (req.query.token as string) ||
    process.env.VITE_DOPPLER_TOKEN ||
    process.env.DOPPLER_TOKEN;

  if (!token) {
    return res.status(400).json({ error: "No Doppler token provided" });
  }

  try {
    const response = await fetch(
      "https://api.doppler.com/v3/configs/config/secrets/download?format=json",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "Vexea-Server/1.0",
        },
      }
    );

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: `Doppler API error: ${response.statusText}` });
    }

    const secrets = await response.json();
    return res.json(secrets);
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: err.message || "Failed to fetch Doppler client secrets" });
  }
});

app.get("/api/proxy-asset", async (req, res) => {
  const fileUrl = req.query.url as string;
  if (!fileUrl) {
    return res.status(400).send("URL parameter is required");
  }

  try {
    const fetchResponse = await fetch(fileUrl, {
      headers: {
        "User-Agent": "Vexea-Game-Server/1.0"
      }
    });
    if (!fetchResponse.ok) {
      return res
        .status(fetchResponse.status)
        .send(`Failed to fetch from remote: ${fetchResponse.statusText}`);
    }

    const contentType =
      fetchResponse.headers.get("Content-Type") || "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

    const contentLength = fetchResponse.headers.get("Content-Length");
    if (contentLength) {
      res.setHeader("Content-Length", contentLength);
    }

    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

    const arrayBuffer = await fetchResponse.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (error: any) {
    console.error(`[Proxy] Error fetching from remote URL ${fileUrl}:`, error);
    res.status(500).send(`Proxy Error: ${error.message || error}`);
  }
});

app.get("/api/debug", (req, res) => {
  const roomsData = matchManager.getRooms().map((r) => ({
    roomId: r.roomId,
    active: r.matchActive,
    playerCount: r.players.size,
    players: Array.from(r.players.keys()),
    droneCount: r.drones.filter((d) => d.state !== DroneState.DEAD).length,
  }));
  res.json({ rooms: roomsData, logs: globalServerLogs });
});

app.get("/api/test-compile", (req, res) => {
  console.log("[SERVER TEST] Custom /api/test-compile endpoint was hit!");
  res.json({ success: true, timestamp: Date.now(), customLabel: "VEXEA_COMPILED_VERSION" });
});

app.get("/api/economy/store", async (req, res) => {
  try {
    const discountActive = String(req.query.discount || "false") === "true";
    const creditMultiplier = parseFloat(String(req.query.multiplier || "1.0"));
    const offers = serverEconomyService.getOffers(discountActive, creditMultiplier);
    res.json({ success: true, offers });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || err });
  }
});

app.get("/api/economy/factions", async (req, res) => {
  try {
    const warMultiplier = parseFloat(String(req.query.warMultiplier || "1.0"));
    const sectors = serverEconomyService.getFactionSectors(warMultiplier);
    res.json({ success: true, sectors, globalWarStatus: "active", epoch: 4 });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || err });
  }
});

io.onConnection((channel: ChannelAdapter) => {
  globalChannels.push(channel);
  const playerId = `PL_${Math.floor(Math.random() * 100000)}`;

  // Send initial configuration to client
  channel.emit("session_init", {
    playerId,
    serverTime: Date.now(),
    config: {
      gameVersion: "0.1.0",
      environment: process.env.NODE_ENV || "development"
    }
  });

  // Register connection only. No MatchRoom. No physics. No AI.
  let currentRoom: MatchRoom | null = null;
  let pState: PlayerState | null = null;
  connectionRegistry.register(playerId, channel);

  // Matchmaking request: Delegates directly to Matchmaker module
  const handleMatchmakingRequest = (args: any) => {
    const reqUid = args?.uid || playerId;
    const reqMap = args?.mapId || args?.map?.id || "map_1_facility";
    const reqClass = (args?.class || args?.playerClass || "ASSAULT") as ClassId;

    console.log(
      `[VEXEA SERVER] Player ${playerId} requesting matchmaking (Map: ${reqMap}, Class: ${reqClass}, DevQuickStart: ${!!args?.isDevQuickStart})`,
    );

    // Dev Quick Start path: create/get room directly without multi-player queue
    if (args?.isDevQuickStart) {
      const devMatchId = args?.matchId || `M_DEV_${Math.floor(Math.random() * 1000000)}`;
      console.log(`[VEXEA SERVER] Dev Quick Start match initialization: ${devMatchId} on map ${reqMap}`);
      const targetRoom = matchManager.getOrCreateRoom(devMatchId, process.env.GEMINI_API_KEY, reqMap);
      if (currentRoom && currentRoom !== targetRoom) {
        currentRoom.removePlayer(pState.id);
      }
      currentRoom = targetRoom;
      (channel as any).currentRoom = targetRoom;
      pState = currentRoom.registerPlayer(playerId, channel, null, reqClass);
      return;
    }

    // No lobby room to leave. Enter matchmaking pool directly.
    // Store callback on channel so matchmaker can notify us when match forms.
    (channel as any).onMatchFormed = (room: MatchRoom, state: PlayerState) => {
      currentRoom = room;
      pState = state;
    };

    matchmaker.addPlayerToPool(playerId, reqUid, channel, reqMap, reqClass);
  };

  channel.on("start_match", handleMatchmakingRequest);
  channel.on("request_matchmaking", handleMatchmakingRequest);

  channel.on("cancel_matchmaking", () => {
    matchmaker.removePlayerFromPool(playerId);
  });

  channel.on("loading_complete", (args: any) => {
    if (args?.matchId) {
      matchmaker.signalPlayerLoadingComplete(args.matchId, playerId);
    }
  });

  channel.on("select_class", (args: any) => {
    const newClassId = (args?.classId || args?.class) as ClassId;
    if (newClassId && CLASSES[newClassId]) {
      if (args?.matchId) {
        matchmaker.handlePlayerClassChange(args.matchId, playerId, newClassId);
      } else if (currentRoom) {
        currentRoom.applyPlayerClassLoadout(playerId, newClassId);
      }
      // If no currentRoom and no matchId, class selection is client-side only (menu)
    }
  });

  channel.on("ping", () => {
    channel.emit("pong", {});
  });

  channel.on("latency_report", (data: any) => {
    if (typeof data?.latency === "number") {
      if (pState) {
        pState.ping = data.latency;
      }
      // Also store on channel for pre-match latency tracking
      (channel as any).ping = data.latency;
    }
  });

  channel.on("player_ready", () => {
    const activeRoom = currentRoom;
    if (activeRoom && pState) {
      activeRoom.setPlayerReady(pState.id);
    }
  });

  channel.on("rewarded_ad", () => {
    if (pState) {
      pState.adMultiplier = 2;
    }
    // If no pState (not in match), ad reward is queued or ignored
  });

  channel.onRaw((message: any) => {
    if (!pState) return;
    const buffer = message as ArrayBuffer;
    if (buffer.byteLength >= 20) {
      const dataView = new DataView(buffer);
      const seq = dataView.getUint32(0, true);
      const inputMask = dataView.getUint8(4);
      const pitch = dataView.getFloat32(5, true);
      const yaw = dataView.getFloat32(9, true);

      if (seq > pState.lastSequence) {
        pState.lastSequence = seq;
        pState.pitch = pitch;
        pState.yaw = yaw;
        pState.inputMask = inputMask;
      }
    }
  });

  registerDevCommands(
    channel,
    db,
    () => currentRoom,
    () => pState
  );

  channel.on("ping", () => {
    channel.emit("pong", {});
  });

  channel.on("latency_report", (args: any) => {
    if (typeof args?.latency === "number") {
      if (pState) {
        pState.ping = args.latency;
      }
      (channel as any).ping = args.latency;
    }
  });

  channel.on("dev_force_match_end", (args: any) => {
    if (!IS_DEV || !currentRoom) return;
    const result = args?.result === "win" ? "win" : "loss";
    console.log(`[SERVER DEV EVENT] Forcing match end with result:`, result);
    (currentRoom as any).handleMatchEnd(result);
  });

  channel.on("debug_get_state", () => {
    if (!IS_DEV || !currentRoom) return;
    const state = {
      players: Array.from(currentRoom.players.values()).map(p => ({
        id: p.id,
        pos: { x: p.posX, y: p.posY, z: p.posZ }
      })),
      drones: currentRoom.drones.filter((d: any) => d.state !== DroneState.DEAD).map((d: any) => ({
        id: d.id,
        type: d.type,
        pos: { x: d.posX, y: d.posY, z: d.posZ }
      })),
      buildings: currentRoom.collisionMap?.boxes || []
    };
    channel.emit("debug_state_response", state);
  });

  channel.on("reliable_event", (args: any) => {
    if (!pState) return;

    if (args.type === "CHAT_MESSAGE") {
      const message = args.message;
      if (message && typeof message === "string" && message.trim().length > 0 && currentRoom) {
        const trimmed = message.trim().slice(0, 150);
        for (const [id, player] of currentRoom.players.entries()) {
          player.channel.emit("reliable_event", {
            type: "CHAT_MESSAGE",
            sender: pState.id,
            message: trimmed
          });
        }
      }
      return;
    }

    if (args.type === "QUICK_COMM") {
      const optionId = args.optionId;
      if (optionId && typeof optionId === "string" && currentRoom) {
        for (const [id, player] of currentRoom.players.entries()) {
          player.channel.emit("reliable_event", {
            type: "QUICK_COMM",
            sender: pState.id,
            optionId: optionId
          });
        }
      }
      return;
    }

    if (!pState.isAlive) return;

    if (args.type === "USE_UTILITY") {
      const slot = args.slot as "utility1" | "utility2";
      if (slot && currentRoom) {
        currentRoom.useUtility(pState.id, slot);
      }
    }

    if (args.type === "OBJECTIVE_HOLD") {
      if (currentRoom) {
        currentRoom.setObjectiveHold(pState.id, !!args.holding);
      }
    }

    if (args.type === "TOGGLE_FIRE_MODE") {
      const primary = pState.weaponState.primary;
      primary.fireMode = primary.fireMode === "auto" ? "burst" : "auto";
      pState.channel.emit("reliable_event", {
        type: "FIRE_MODE_CHANGED",
        mode: primary.fireMode,
      });
    }

    if (args.type === "RELOAD") {
      const slot = args.weaponSlot as "primary" | "secondary";
      if (!slot) return;
      const wState = pState.weaponState[slot];
      const wDef = slot === "primary" ? WEAPONS.rifle : WEAPONS.pistol;
      const reloadTicks = slot === "primary" ? 150 : 120;

      if (!wState.isReloading && wState.currentMag < wDef.capacity && wState.reserve > 0) {
        wState.isReloading = true;
        wState.reloadTimer = reloadTicks;
      }
      pState.channel.emit("reliable_event", {
        type: "AMMO_STATE",
        primary: pState.weaponState.primary,
        secondary: pState.weaponState.secondary,
      });
    }

    if (args.type === "CANCEL_RELOAD") {
      const slot = args.weaponSlot as "primary" | "secondary";
      if (!slot) return;
      const wState = pState.weaponState[slot];
      if (wState.isReloading) {
        wState.isReloading = false;
        wState.reloadTimer = 0;
      }
      pState.channel.emit("reliable_event", {
        type: "AMMO_STATE",
        primary: pState.weaponState.primary,
        secondary: pState.weaponState.secondary,
      });
    }

    if (args.type === "FIRE") {
      const slot = args.weaponSlot as "primary" | "secondary";
      const isPrimary = slot === "primary";
      const weaponStats = isPrimary ? WEAPONS.rifle : WEAPONS.pistol;
      const wState = pState.weaponState[slot];

      if (!currentRoom) return;

      if (wState.currentMag <= 0) {
        if (!wState.isReloading && wState.reserve > 0) {
          wState.isReloading = true;
          wState.reloadTimer = isPrimary ? 150 : 120;
          pState.channel.emit("reliable_event", {
            type: "AMMO_STATE",
            primary: pState.weaponState.primary,
            secondary: pState.weaponState.secondary,
          });
        }
        return;
      }
      if (wState.isReloading) return;

      const now = Date.now();
      const allowedInterval = 1000 / weaponStats.fireRateHz;

      let leakyUpdate = Math.max(
        0,
        wState.leakyBucket -
          (now - wState.lastConfirmedShotT) / allowedInterval,
      );

      if (leakyUpdate < weaponStats.capacity) {
        wState.leakyBucket = leakyUpdate + 1;
        wState.lastConfirmedShotT = now;
        pState.firedThisTick = true;
        
        if (pState.infiniteAmmo) {
          wState.currentMag = weaponStats.capacity; // keep full
        } else {
          wState.currentMag--;
        }

        if (wState.currentMag === 0 && wState.reserve > 0 && !pState.infiniteAmmo) {
          wState.isReloading = true;
          wState.reloadTimer = isPrimary ? 150 : 120;
        }

        pState.channel.emit("reliable_event", {
          type: "AMMO_STATE",
          primary: pState.weaponState.primary,
          secondary: pState.weaponState.secondary,
        });

        processHitscan(pState, currentRoom, channel, args);
      }
    }
  });

  channel.on("PLAYER_QUIT", () => {
    matchmaker.removePlayerFromPool(playerId);
    if (pState && currentRoom) {
      console.log(`Player quit mission manually: ${pState.id}`);
      currentRoom.removePlayer(pState.id);
    }
    try {
      channel.emit("disconnect", {});
    } catch (e) {}
  });

  channel.onDisconnect(() => {
    matchmaker.removePlayerFromPool(playerId);
    connectionRegistry.unregister(playerId);
    if (pState && currentRoom) {
      const pid = pState.id;
      console.log(`Disconnection registered: ${pid}. Waiting 10s for reconnection...`);
      
      setTimeout(() => {
        // If the player still has the same room and isn't connected
        const p = currentRoom!.players.get(pid);
        if (p && !p.channel.connected) {
           console.log(`[MATCH] Reconnection timeout expired for player ${pid}. Removing.`);
           currentRoom!.removePlayer(pid);
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
    // In production, the server and client live on completely different machines.
    // The server is compiled into dist/server/server.cjs and does not have the client assets.
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
