const { fork } = require("child_process");
const { monitorEventLoopDelay } = require("perf_hooks");
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

async function runChildBaseline(childCount, durationMs = 18000) {
  console.log(`\n=== Running Process Isolation Baseline with ${childCount} Child Process(es) (${durationMs / 1000}s) ===`);

  const childScript = path.join(__dirname, "child_idle.cjs");
  if (!fs.existsSync(childScript)) {
    fs.writeFileSync(childScript, `
      const { monitorEventLoopDelay } = require("perf_hooks");
      const eld = monitorEventLoopDelay({ resolution: 10 });
      eld.enable();
      const startUsage = process.cpuUsage();
      const startTime = Date.now();
      process.send({ type: "ready", pid: process.pid });
      
      process.on("message", (msg) => {
        if (msg.type === "stop") {
          eld.disable();
          const cpu = process.cpuUsage(startUsage);
          const mem = process.memoryUsage();
          process.send({
            type: "stats",
            pid: process.pid,
            cpuUserMs: Math.round(cpu.user / 1000),
            cpuSystemMs: Math.round(cpu.system / 1000),
            rssBytes: mem.rss,
            heapUsedBytes: mem.heapUsed,
            eldMeanMs: eld.mean / 1e6,
            eldP95Ms: eld.percentile(95) / 1e6,
            eldMaxMs: eld.max / 1e6
          });
          setTimeout(() => process.exit(0), 50);
        }
      });
    `);
  }

  const parentEld = monitorEventLoopDelay({ resolution: 10 });
  parentEld.enable();

  const startParentCpu = process.cpuUsage();
  const parentStartStatus = getProcStatus(process.pid);

  const children = [];
  const startupTimes = [];

  for (let i = 0; i < childCount; i++) {
    const t0 = performance.now();
    const child = fork(childScript, [], { stdio: ["ignore", "ignore", "ignore", "ipc"] });
    const readyPromise = new Promise((resolve) => {
      child.on("message", (msg) => {
        if (msg.type === "ready") {
          startupTimes.push(performance.now() - t0);
          resolve();
        }
      });
    });
    children.push({ child, readyPromise });
  }

  await Promise.all(children.map(c => c.readyPromise));

  // Wait for test duration
  await new Promise(r => setTimeout(r, durationMs));

  // Collect stats
  const childStatsPromises = children.map(({ child }) => {
    return new Promise(resolve => {
      child.on("message", (msg) => {
        if (msg.type === "stats") {
          const procStatus = getProcStatus(child.pid);
          resolve({ ...msg, ...procStatus });
        }
      });
      child.send({ type: "stop" });
    });
  });

  const childStats = await Promise.all(childStatsPromises);

  parentEld.disable();
  const parentCpu = process.cpuUsage(startParentCpu);
  const parentMem = process.memoryUsage();
  const parentEndStatus = getProcStatus(process.pid);

  const parentUserMs = Math.round(parentCpu.user / 1000);
  const parentSysMs = Math.round(parentCpu.system / 1000);
  const totalChildUserMs = childStats.reduce((sum, c) => sum + c.cpuUserMs, 0);
  const totalChildSysMs = childStats.reduce((sum, c) => sum + c.cpuSystemMs, 0);
  const totalChildRssBytes = childStats.reduce((sum, c) => sum + c.rssBytes, 0);
  const totalRssBytes = parentMem.rss + totalChildRssBytes;

  const totalVolCtxt = (parentEndStatus.voluntary - parentStartStatus.voluntary) +
    childStats.reduce((sum, c) => sum + c.voluntary, 0);
  const totalNonVolCtxt = (parentEndStatus.nonvoluntary - parentStartStatus.nonvoluntary) +
    childStats.reduce((sum, c) => sum + c.nonvoluntary, 0);

  const result = {
    childCount,
    durationMs,
    avgStartupMs: (startupTimes.reduce((a, b) => a + b, 0) / startupTimes.length).toFixed(2),
    parent: {
      cpuUserMs: parentUserMs,
      cpuSystemMs: parentSysMs,
      rssMB: (parentMem.rss / (1024 * 1024)).toFixed(1),
      eldMeanMs: (parentEld.mean / 1e6).toFixed(2),
      eldP95Ms: (parentEld.percentile(95) / 1e6).toFixed(2),
      eldMaxMs: (parentEld.max / 1e6).toFixed(2)
    },
    children: childStats.map(c => ({
      pid: c.pid,
      cpuUserMs: c.cpuUserMs,
      cpuSystemMs: c.cpuSystemMs,
      rssMB: (c.rssBytes / (1024 * 1024)).toFixed(1),
      eldP95Ms: c.eldP95Ms.toFixed(2),
      voluntaryCtxt: c.voluntary,
      nonvoluntaryCtxt: c.nonvoluntary
    })),
    totals: {
      totalUserMs: parentUserMs + totalChildUserMs,
      totalSysMs: parentSysMs + totalChildSysMs,
      totalCpuMs: parentUserMs + parentSysMs + totalChildUserMs + totalChildSysMs,
      steadyStateCpuPercent: (((parentUserMs + parentSysMs + totalChildUserMs + totalChildSysMs) / durationMs) * 100).toFixed(2) + "%",
      parentRssMB: (parentMem.rss / (1024 * 1024)).toFixed(1),
      workerRssTotalMB: (totalChildRssBytes / (1024 * 1024)).toFixed(1),
      totalRssMB: (totalRssBytes / (1024 * 1024)).toFixed(1),
      totalVoluntaryCtxt: totalVolCtxt,
      totalNonVoluntaryCtxt: totalNonVolCtxt
    }
  };

  console.log(JSON.stringify(result, null, 2));
  return result;
}

async function main() {
  const r1 = await runChildBaseline(1, 18000);
  const r2 = await runChildBaseline(2, 18000);
  const r3 = await runChildBaseline(3, 18000);
  fs.writeFileSync(path.join(__dirname, "baseline_process_results.json"), JSON.stringify({ r1, r2, r3 }, null, 2));
}

main().catch(console.error);
