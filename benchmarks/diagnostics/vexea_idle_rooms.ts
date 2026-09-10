import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { ForkedRoomExecution } from "../../server/execution/ForkedRoomExecution";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getProcStatus(pid: number) {
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

async function runIdleVexeaRooms(roomCount: number, durationMs = 18000) {
  console.log(`\n=== Running VEXEA Idle Worker Diagnostic with ${roomCount} Room(s) (${durationMs / 1000}s) ===`);

  const startParentCpu = process.cpuUsage();
  const parentStartStatus = getProcStatus(process.pid);
  const rooms: ForkedRoomExecution[] = [];
  const startupTimes: number[] = [];

  for (let i = 0; i < roomCount; i++) {
    const roomId = `diag-idle-${roomCount}-${i}`;
    const t0 = performance.now();
    const exec = new ForkedRoomExecution(roomId, {
      readyTimeoutMs: 15000,
    });
    exec.start();
    await exec.waitUntilReady();
    startupTimes.push(performance.now() - t0);
    rooms.push(exec);
  }

  // Let them run in idle state (5ms physics tick running with empty room)
  await new Promise(r => setTimeout(r, durationMs));

  // Collect stats from child processes via /proc/[pid]/stat or process
  const childStats = rooms.map(exec => {
    const pid = exec.pid!;
    let cpuUserMs = 0;
    let cpuSysMs = 0;
    let rssBytes = 0;
    try {
      const stat = fs.readFileSync(`/proc/${pid}/stat`, "utf8").split(" ");
      const utime = parseInt(stat[13], 10);
      const stime = parseInt(stat[14], 10);
      const rssPages = parseInt(stat[23], 10);
      // clock ticks per sec is usually 100 in Linux
      cpuUserMs = utime * 10;
      cpuSysMs = stime * 10;
      rssBytes = rssPages * 4096;
    } catch (e) {}

    const status = getProcStatus(pid);
    return {
      pid,
      cpuUserMs,
      cpuSysMs,
      rssMB: (rssBytes / (1024 * 1024)).toFixed(1),
      ...status
    };
  });

  // Stop rooms
  for (const exec of rooms) {
    await exec.terminate();
  }

  const parentCpu = process.cpuUsage(startParentCpu);
  const parentMem = process.memoryUsage();
  const parentEndStatus = getProcStatus(process.pid);

  const parentUserMs = Math.round(parentCpu.user / 1000);
  const parentSysMs = Math.round(parentCpu.system / 1000);
  const totalChildUserMs = childStats.reduce((sum, c) => sum + c.cpuUserMs, 0);
  const totalChildSysMs = childStats.reduce((sum, c) => sum + c.cpuSysMs, 0);
  const totalChildRssMB = childStats.reduce((sum, c) => sum + parseFloat(c.rssMB), 0);

  const result = {
    roomCount,
    durationMs,
    avgStartupMs: (startupTimes.reduce((a, b) => a + b, 0) / startupTimes.length).toFixed(2),
    parent: {
      cpuUserMs: parentUserMs,
      cpuSystemMs: parentSysMs,
      rssMB: (parentMem.rss / (1024 * 1024)).toFixed(1)
    },
    children: childStats,
    totals: {
      totalUserMs: parentUserMs + totalChildUserMs,
      totalSysMs: parentSysMs + totalChildSysMs,
      totalCpuMs: parentUserMs + parentSysMs + totalChildUserMs + totalChildSysMs,
      steadyStateCpuPercent: (((parentUserMs + parentSysMs + totalChildUserMs + totalChildSysMs) / durationMs) * 100).toFixed(2) + "%",
      parentRssMB: (parentMem.rss / (1024 * 1024)).toFixed(1),
      workerRssTotalMB: totalChildRssMB.toFixed(1),
      totalRssMB: ((parentMem.rss / (1024 * 1024)) + totalChildRssMB).toFixed(1)
    }
  };

  console.log(JSON.stringify(result, null, 2));
  return result;
}

async function main() {
  const r1 = await runIdleVexeaRooms(1, 18000);
  const r2 = await runIdleVexeaRooms(2, 18000);
  const r3 = await runIdleVexeaRooms(3, 18000);
  fs.writeFileSync(path.join(__dirname, "vexea_idle_results.json"), JSON.stringify({ r1, r2, r3 }, null, 2));
}

main().catch(console.error);
