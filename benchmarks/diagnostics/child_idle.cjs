
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
    