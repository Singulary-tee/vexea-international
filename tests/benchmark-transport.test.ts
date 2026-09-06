import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import { geckosIncomingAccounting } from "../benchmarks/src/client-transport";
import { geckosEmitOptions, toArrayBuffer } from "../server/transport/adapter";

describe("benchmark transport accounting", () => {
  it("counts Geckos raw, state-sync, and reliable bridge messages", () => {
    const raw = geckosIncomingAccounting("rawMessage", Buffer.from([1, 2, 3]));
    const state = geckosIncomingAccounting("state_sync", { players: [] });
    const reliable = geckosIncomingAccounting("reliable_event", {
      MESSAGE: { type: "FIRE" },
      RELIABLE: 1,
      ID: "message-id",
    });

    expect(raw).toMatchObject({ incomingMessages: 1, incomingBytes: 3, rawIncomingBytes: 3 });
    expect(state).toMatchObject({ incomingMessages: 1, stateSyncMessages: 1 });
    expect(reliable).toMatchObject({ incomingMessages: 1, reliableMessages: 1 });
    expect(reliable.incomingBytes).toBeGreaterThan(0);
  });

  it("preserves explicit reliability and defaults the reliable gameplay event", () => {
    expect(geckosEmitOptions("reliable_event")).toEqual({ reliable: true });
    expect(geckosEmitOptions("state_sync")).toBeUndefined();
    expect(geckosEmitOptions("state_sync", { reliable: true })).toEqual({ reliable: true });
    expect(geckosEmitOptions("state_sync", { reliable: false })).toEqual({ reliable: false });
  });

  it("normalizes Buffer input without exposing pooled bytes", () => {
    const buffer = toArrayBuffer(Buffer.from([4, 5, 6]));
    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect(Array.from(new Uint8Array(buffer!))).toEqual([4, 5, 6]);
  });
});
