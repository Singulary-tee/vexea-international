import { BenchmarkClientTransport } from "./client-transport";
import {
  BenchmarkAdvance,
  BenchmarkInput,
  BenchmarkJoinRequest,
  BenchmarkObservation,
  BenchmarkReliableAction,
  BenchmarkScenarioDriver,
  BenchmarkSpawn,
} from "./scenario";

const PROTOCOL = {
  sessionInitialized: "session_init",
  matchReady: "match_ready",
  join: "start_match",
  loadingComplete: "loading_complete",
  ready: "player_ready",
  disableAi: "dev_toggle_llm",
  bots: "dev_spawn_bots",
  drone: "dev_spawn_drone",
  projectiles: "benchmark_spawn_projectiles",
  reliable: "reliable_event",
  ping: "ping",
} as const;

export function encodeInputPacket(input: BenchmarkInput): Uint8Array {
  const packet = new Uint8Array(20);
  const view = new DataView(packet.buffer);
  view.setUint32(0, input.sequence, true);
  view.setUint8(4, input.moveForward ? 1 : 0);
  view.setFloat32(5, input.pitch, true);
  view.setFloat32(9, input.yaw, true);
  return packet;
}

function observationEvent(observation: BenchmarkObservation): string {
  return observation === "session-initialized" ? PROTOCOL.sessionInitialized : PROTOCOL.matchReady;
}

export function createBenchmarkScenarioDriver(
  transport: BenchmarkClientTransport,
): BenchmarkScenarioDriver {
  let identity: BenchmarkJoinRequest | undefined;

  return {
    join(nextIdentity: BenchmarkJoinRequest) {
      identity = nextIdentity;
      transport.emit(PROTOCOL.join, {
        isDevQuickStart: true,
        matchId: nextIdentity.matchId,
        mapId: nextIdentity.mapId,
        uid: nextIdentity.uid,
        displayName: nextIdentity.displayName,
      });
    },

    spawn(command: BenchmarkSpawn) {
      if (command.kind === "bots") {
        transport.emit(PROTOCOL.bots, { count: command.count });
      } else if (command.kind === "drone") {
        transport.emit(PROTOCOL.drone, { type: command.type, ...command.position });
      } else {
        transport.emit(PROTOCOL.projectiles, { count: command.count });
      }
    },

    input(command: BenchmarkInput) {
      transport.rawEmit(encodeInputPacket(command));
    },

    reliable(command: BenchmarkReliableAction) {
      transport.emitReliable(
        PROTOCOL.reliable,
        command.kind === "objective-hold"
          ? { type: "OBJECTIVE_HOLD", holding: command.holding }
          : { type: "FIRE", weaponSlot: command.weaponSlot },
      );
    },

    advance(command: BenchmarkAdvance) {
      if (command.kind === "loading-complete") {
        if (!identity) throw new Error("Cannot complete loading before joining a scenario");
        transport.emit(PROTOCOL.loadingComplete, { matchId: identity.matchId });
      } else if (command.kind === "ready") {
        transport.emit(PROTOCOL.ready, {});
      } else {
        transport.emit(PROTOCOL.disableAi, { disabled: true });
      }
    },

    observe(observation, callback) {
      transport.on(observationEvent(observation), callback);
    },

    probe() {
      transport.emit(PROTOCOL.ping, {});
    },
  };
}
