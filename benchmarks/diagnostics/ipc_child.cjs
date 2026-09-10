
      let receivedCount = 0;
      let startCpu = null;
      let startStatus = null;
      
      function getProcStatus() {
        try {
          const text = require("fs").readFileSync("/proc/" + process.pid + "/status", "utf8");
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
    