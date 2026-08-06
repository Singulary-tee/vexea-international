import { describe, it, expect, vi, beforeEach } from 'vitest';
import { matchManager } from '../server/MatchManager';
import { MatchRoom } from '../server/MatchRoom';

vi.mock('../server/MatchRoom', () => {
  return {
    MatchRoom: class {
      public roomId: string;
      public players = new Map();
      public matchActive = false;
      public onShutdown: any = null;
      constructor(id: string) {
        this.roomId = id;
      }
      shutdown() {
        if (this.onShutdown) this.onShutdown(this.roomId);
      }
    }
  };
});

describe('MatchManager Tests', () => {
  beforeEach(() => {
    // Clear rooms between tests
    const rooms = matchManager.getRooms();
    rooms.forEach(r => matchManager.deleteRoom(r.roomId));
  });

  it('should create and retrieve rooms', () => {
    const room = matchManager.getOrCreateRoom('test-room');
    expect(room).toBeDefined();
    expect(room.roomId).toBe('test-room');
    expect(matchManager.getRoomCount()).toBe(1);

    const sameRoom = matchManager.getOrCreateRoom('test-room');
    expect(sameRoom).toBe(room);
    expect(matchManager.getRoomCount()).toBe(1);
  });

  it('should find matchmaking rooms', () => {
    const room = matchManager.findMatchmakingRoom();
    expect(room).toBeDefined();
    expect(room.roomId).toMatch(/^M_AUTO_/);
  });

  it('should reuse open matchmaking rooms', () => {
    const room1 = matchManager.getOrCreateRoom('M_OPEN');
    const room2 = matchManager.findMatchmakingRoom();
    expect(room2).toBe(room1);
  });

  it('should delete rooms', () => {
    matchManager.getOrCreateRoom('to-delete');
    expect(matchManager.getRoomCount()).toBe(1);
    matchManager.deleteRoom('to-delete');
    expect(matchManager.getRoomCount()).toBe(0);
  });
});
