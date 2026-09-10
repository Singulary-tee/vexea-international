const { fork } = require("child_process");
const fs = require("fs");
const path = require("path");

function getProcStatus(pid) {
  try {
    const text = fs.readFileSync(`/proc/${pid}/status`, "utf8");
    const vol = text.match(/voluntary_ctxt_switches:\s+(\d+)/);
    const nonvol = text.match(/nonvoluntary_ctxt_switches:\s+(\d+)/);
    return {
      voluntary: vol ? parseInt(vol[1], 10) : 0,
      nonvoluntary: nonvol ? parseInt(nonvol[1], 10) : 0
    };
  } catch (e) {
    return { voluntary: 0, nonvoluntary: 0 };
  }
}

// Generate representative payloads
function createMockStateSync(entityCount = 30) {
  const entities = [];
  for (let i = 0; i < entityCount; i++) {
    entities.push({
      id: `ent-${i}`,
      type: i < 10 ? "player" : "drone",
      x: 10.5 + i,
      y: 0.0,
      z: -20.2 + i,
      vx: 0.1,
      vy: 0.0,
      vz: 0.5,
      yaw: 1.23,
      pitch: 0.05,
      hp: 100,
      state: "active"
    });
  }
  return {
    type: "STATE_SYNC",
    tick: 12345,
    timestamp: Date.now(),
    entities
  };
}

const PAYLOAD_TYPES = {
  tiny_control: {
    name: "Tiny Control Message",
    generator: () => ({ type: "PING", timestamp: Date.now(), seq: 42 })
  },
  player_input: {
    name: "Player Input Message",
    generator: () => ({
      type: "PLAYER_INPUT",
      playerId: "player-alpha-1",
      seq: 1024,
      moveX: 0.707,
      moveY: -0.707,
      yaw: 1.5708,
      pitch: -0.12,
      fire: true,
      jump: false,
      sprint: true,
      timestamp: Date.now()
    })
  },
  reliable_event: {
    name: "Reliable Gameplay Event",
    generator: () => ({
      type: "RELIABLE_EVENT",
      eventId: "evt-99128",
      name: "PLAYER_HIT",
      targetPlayerId: "player-beta-2",
      attackerId: "player-alpha-1",
      weapon: "assault_rifle",
      hitbox: "head",
      damage: 45.5,
      position: { x: 12.4, y: 1.8, z: -55.2 },
      timestamp: Date.now()
    })
  },
  state_sync_json: {
    name: "State Synchronization JSON (30 entities)",
    generator: () => createMockStateSync(30)
  },
  raw_binary_buffer_4kb: {
    name: "Raw Binary Buffer (4 KB)",
    generator: () => {
      const buf = Buffer.alloc(4096);
      buf.writeUInt32LE(12345, 0);
      buf.writeFloatLE(1.234, 4);
      return buf;
    }
  }
};

async function measurePayloadSerialization(payload) {
  // Measure explicit JSON stringify/parse cost if JSON
  const iterations = 10000;
  let serTimeMs = 0;
  let deserTimeMs = 0;
  if (!Buffer.isBuffer(payload)) {
    const t0 = performance.now();
    for (let i = 0; i < iterations; i++) {
      JSON.stringify(payload);
    }
    serTimeMs = (performance.now() - t0) / iterations;

    const str = JSON.stringify(payload);
    const t1 = performance.now();
    for (let i = 0; i < iterations; i++) {
      JSON.parse(str);
    }
    deserTimeMs = (performance.now() - t1) / iterations;
  }
  return { serTimeMs, deserTimeMs };
}

async function runIpcTest(key, config, messageCount = 5000) {
  console.log(`\n--- Measuring IPC: ${config.name} (${messageCount} messages) ---`);

  const samplePayload = config.generator();
  const rawSize = Buffer.isBuffer(samplePayload) ? samplePayload.length : Buffer.byteLength(JSON.stringify(samplePayload));
  const { serTimeMs, deserTimeMs } = await measurePayloadSerialization(samplePayload);

  const childScript = path.join(__dirname, "ipc_child.cjs");
  if (!fs.existsSync(childScript)) {
    fs.writeFileSync(childScript, `
      let receivedCount = 0;
      let startCpu = null;
      let startStatus = null;
      
      function getProcStatus() {
        try {
          const text = require("fs").readFileSync("/proc/" + process.pid + "/status", "utf8");
          const vol = text.match(/voluntary_ctxt_switches:\\s+(\\d+)/);
          const nonvol = text.match(/nonvoluntary_ctxt_switches:\\s+(\\d+)/);
          return {
            voluntary: vol ? parseInt(vol[1], 10) : 0,
            nonvoluntary: nonvol ? parseInt(nonvol[1], 10) : 0
          };
        } catch (e) {
          return { voluntary: 0, nonvoluntary: 0 };
        }
      }

      process.on("message", (msg) => {
        if (msg.type === "START") {
          startCpu = process.cpuUsage();
          startStatus = getProcStatus();
          receivedCount = 0;
          process.send({ type: "READY" });
        } else if (msg.type === "STOP") {
          const cpu = process.cpuUsage(startCpu);
          const endStatus = getProcStatus();
          process.send({
            type: "DONE",
            receivedCount,
            cpuUserMs: Math.round(cpu.user / 1000),
            cpuSystemMs: Math.round(cpu.system / 1000),
            volCtxt: endStatus.voluntary - startStatus.voluntary,
            nonvolCtxt: endStatus.nonvoluntary - startStatus.nonvoluntary
          });
        } else {
          receivedCount++;
          // echo back or acknowledge every N messages
          if (receivedCount % 100 === 0) {
            process.send({ type: "ACK", count: receivedCount });
          }
        }
      });
    `);
  }

  const child = fork(childScript, [], { stdio: ["ignore", "ignore", "ignore", "ipc"] });

  await new Promise((resolve) => {
    child.once("message", (m) => {
      if (m.type === "READY") resolve();
    });
    child.send({ type: "START" });
  });

  const parentStartStatus = getProcStatus(process.pid);
  const parentStartCpu = process.cpuUsage();
  const startTime = performance.now();

  let ackTarget = Math.floor(messageCount / 100) * 100;
  let lastAck = 0;

  const ackPromise = new Promise((resolve) => {
    child.on("message", (msg) => {
      if (msg.type === "ACK") {
        lastAck = msg.count;
        if (lastAck >= messageCount) resolve();
      }
    });
  });

  for (let i = 0; i < messageCount; i++) {
    child.send(samplePayload);
  }

  // Trigger stop and get final results
  const childResultsPromise = new Promise((resolve) => {
    child.on("message", (msg) => {
      if (msg.type === "DONE") resolve(msg);
    });
  });

  child.send({ type: "STOP" });
  const childResult = await childResultsPromise;

  const elapsedMs = performance.now() - startTime;
  const parentCpu = process.cpuUsage(parentStartCpu);
  const parentEndStatus = getProcStatus(process.pid);

  child.kill();

  const parentUserMs = Math.round(parentCpu.user / 1000);
  const parentSysMs = Math.round(parentCpu.system / 1000);
  const totalUserMs = parentUserMs + childResult.cpuUserMs;
  const totalSysMs = parentSysMs + childResult.cpuSystemMs;
  const totalCpuMs = totalUserMs + totalSysMs;

  const totalBytes = rawSize * messageCount;
  const msgsPerSec = (messageCount / (elapsedMs / 1000));
  const bytesPerSec = (totalBytes / (elapsedMs / 1000));

  const cpuMsPer1kMsgs = (totalCpuMs / messageCount) * 1000;
  const cpuMsPerMB = (totalCpuMs / (totalBytes / (1024 * 1024)));

  const volCtxt = (parentEndStatus.voluntary - parentStartStatus.voluntary) + childResult.volCtxt;
  const nonvolCtxt = (parentEndStatus.nonvoluntary - parentStartStatus.nonvoluntary) + childResult.nonvolCtxt;

  const result = {
    key,
    name: config.name,
    messageCount,
    payloadSizeBytes: rawSize,
    totalBytesMB: (totalBytes / (1024 * 1024)).toFixed(2),
    elapsedMs: elapsedMs.toFixed(2),
    throughput: {
      msgsPerSec: Math.round(msgsPerSec),
      bytesPerSecMB: (bytesPerSec / (1024 * 1024)).toFixed(2) + " MB/s"
    },
    parentCpu: {
      userMs: parentUserMs,
      sysMs: parentSysMs
    },
    childCpu: {
      userMs: childResult.cpuUserMs,
      sysMs: childResult.cpuSystemMs
    },
    totalCpuMs,
    cpuMsPer1kMsgs: cpuMsPer1kMsgs.toFixed(3),
    cpuMsPerMB: cpuMsPerMB.toFixed(3),
    serialization: {
      explicitSerMsPerMsg: serTimeMs.toFixed(4),
      explicitDeserMsPerMsg: deserTimeMs.toFixed(4)
    },
    contextSwitches: {
      voluntary: volCtxt,
      nonvoluntary: nonvolCtxt
    }
  };

  console.log(JSON.stringify(result, null, 2));
  return result;
}

async function main() {
  const results = {};
  for (const [key, config] of Object.entries(PAYLOAD_TYPES)) {
    results[key] = await runIpcTest(key, config, key === "state_sync_json" ? 2000 : 5000);
  }
  fs.writeFileSync(path.join(__dirname, "ipc_benchmark_results.json"), JSON.stringify(results, null, 2));
}

main().catch(console.error);
