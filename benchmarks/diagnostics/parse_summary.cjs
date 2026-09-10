const fs = require("fs");
const path = require("path");

const data = JSON.parse(fs.readFileSync(path.join(__dirname, "benchmark_forensic_suite_results.json"), "utf8"));

function extractMetrics(runObj) {
  const m = runObj.summary.metrics;
  return {
    cpuPercent: m["cpu.process_percent"] ? m["cpu.process_percent"].median.toFixed(1) + "%" : "N/A",
    tickP95Ms: m["tick.p95_ms"] ? m["tick.p95_ms"].p95.toFixed(2) + " ms" : "N/A",
    tickMeanMs: m["tick.mean_ms"] ? m["tick.mean_ms"].median.toFixed(2) + " ms" : "N/A",
    droppedTicks: m["tick.dropped_ticks"] ? m["tick.dropped_ticks"].max : "N/A",
    hostRssMB: m["memory.total_host_rss_bytes"] ? (m["memory.total_host_rss_bytes"].max / (1024 * 1024)).toFixed(1) + " MB" : (m["memory.rss_bytes"].max / (1024 * 1024)).toFixed(1) + " MB",
    parentRssMB: m["memory.parent_rss_bytes"] ? (m["memory.parent_rss_bytes"].max / (1024 * 1024)).toFixed(1) + " MB" : "N/A",
    workerTotalRssMB: m["memory.worker_rss_total_bytes"] ? (m["memory.worker_rss_total_bytes"].max / (1024 * 1024)).toFixed(1) + " MB" : "N/A",
    workerRssPerRoomMB: m["memory.worker_rss_per_room_bytes"] ? (m["memory.worker_rss_per_room_bytes"].max / (1024 * 1024)).toFixed(1) + " MB" : "N/A",
    netLogicalBps: m["network.logical_bytes_per_second"] ? Math.round(m["network.logical_bytes_per_second"].median).toLocaleString() + " B/s" : "N/A",
    eventLoopDelayP95: m["event_loop.delay_p95_ms"] ? m["event_loop.delay_p95_ms"].p95.toFixed(2) + " ms" : "N/A",
    eventLoopDelayMax: m["event_loop.delay_max_ms"] ? m["event_loop.delay_max_ms"].max.toFixed(2) + " ms" : "N/A",
    schedulerLatenessMax: m["scheduler.lateness_max_ms"] ? m["scheduler.lateness_max_ms"].max.toFixed(2) + " ms" : "N/A",
    stateSyncMsgs: m["workload.state_sync_messages"] ? m["workload.state_sync_messages"].median : "N/A",
    reliableMsgs: m["workload.reliable_messages"] ? m["workload.reliable_messages"].median : "N/A",
    rawBytes: m["workload.raw_bytes"] ? m["workload.raw_bytes"].median : "N/A",
  };
}

console.log("=== RUN 1: 1 Room Forked ===");
console.log(extractMetrics(data.run1));

console.log("\n=== RUN 2: 2 Rooms Forked ===");
console.log(extractMetrics(data.run2));

console.log("\n=== RUN 3: 3 Rooms Forked (Standard) ===");
console.log(extractMetrics(data.run3));

console.log("\n=== RUN 4: 3 Rooms In-Process ===");
console.log(extractMetrics(data.run3InProcess));

console.log("\n=== RUN 5: 3 Rooms Forked (No Telemetry) ===");
console.log(extractMetrics(data.run3NoTelemetry));
