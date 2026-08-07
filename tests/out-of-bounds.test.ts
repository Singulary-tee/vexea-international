import { describe, it, expect, vi } from 'vitest';
import { OutOfBoundsEnforcer } from '../server/map/OutOfBoundsEnforcer';
import { ZoneRegistry } from '../server/map/ZoneRegistry';

describe('OutOfBoundsEnforcer Tests', () => {
  it('should not warn or damage players who are within valid bounds', () => {
    const enforcer = new OutOfBoundsEnforcer();
    
    // Set up mock registry with known bounds
    const registry = new ZoneRegistry();
    
    const mockChannel = {
      emit: vi.fn(),
    };

    const mockPlayer = {
      id: 'P1',
      isAlive: true,
      hp: 100,
      posX: 144, // inside Courtyard
      posZ: 496,
      godMode: false,
      channel: mockChannel as any,
    };

    const mockRoom = {
      zoneRegistry: registry,
      players: new Map([['P1', mockPlayer as any]]),
      applyDamage: vi.fn(),
    };

    enforcer.tick(mockRoom as any, 1000);

    expect(mockChannel.emit).not.toHaveBeenCalledWith('reliable_event', expect.objectContaining({ type: 'out_of_bounds_warning' }));
    expect(mockPlayer.hp).toBe(100);
    expect(mockRoom.applyDamage).not.toHaveBeenCalled();
  });

  it('should issue warnings when player is out of bounds', () => {
    const enforcer = new OutOfBoundsEnforcer();
    const registry = new ZoneRegistry();

    const mockChannel = {
      emit: vi.fn(),
    };

    const mockPlayer = {
      id: 'P1',
      isAlive: true,
      hp: 100,
      posX: 9999, // out of bounds
      posZ: 9999,
      godMode: false,
      channel: mockChannel as any,
    };

    const mockRoom = {
      zoneRegistry: registry,
      players: new Map([['P1', mockPlayer as any]]),
      applyDamage: vi.fn(),
    };

    // First tick (1 second OOB)
    enforcer.tick(mockRoom as any, 1000);
    expect(enforcer.getPlayerOOBTime('P1')).toBe(1000);
    expect(mockChannel.emit).toHaveBeenCalledWith('reliable_event', {
      type: 'out_of_bounds_warning',
      remainingSeconds: 2,
    });
    expect(mockPlayer.hp).toBe(100); // no damage yet (under 3s grace)

    // Second tick (another 1 second, total 2 seconds)
    enforcer.tick(mockRoom as any, 1000);
    expect(enforcer.getPlayerOOBTime('P1')).toBe(2000);
    expect(mockChannel.emit).toHaveBeenCalledWith('reliable_event', {
      type: 'out_of_bounds_warning',
      remainingSeconds: 1,
    });
    expect(mockPlayer.hp).toBe(100);
  });

  it('should apply 35.0 DPS damage after 3.0 second grace period', () => {
    const enforcer = new OutOfBoundsEnforcer();
    const registry = new ZoneRegistry();

    const mockChannel = {
      emit: vi.fn(),
    };

    const mockPlayer = {
      id: 'P1',
      isAlive: true,
      hp: 100,
      posX: 9999,
      posZ: 9999,
      godMode: false,
      channel: mockChannel as any,
    };

    const mockRoom = {
      zoneRegistry: registry,
      players: new Map([['P1', mockPlayer as any]]),
      applyDamage: vi.fn(),
    };

    // 1. Advance OOB time to 2.9s (still inside grace period, no damage yet)
    enforcer.tick(mockRoom as any, 2900);
    expect(enforcer.getPlayerOOBTime('P1')).toBe(2900);
    expect(mockPlayer.hp).toBe(100);
    expect(mockRoom.applyDamage).not.toHaveBeenCalled();

    // 2. Advance OOB time past 3.0s (another 200ms, total 3100ms)
    enforcer.tick(mockRoom as any, 200);

    // Player is still alive, so OOB time continues to track
    expect(enforcer.getPlayerOOBTime('P1')).toBe(3100);

    // Damage = 35.0 * (200 / 1000) = 7.0 damage applied in this tick. But wait, since their HP
    // drops (or we mock them to die, or we just assert applyDamage was called if their HP hit 0. 
    // Here we ticked 2900ms and then 200ms. In the second tick, oobMs = 3100 >= 3000, so it applies 35 * 0.2 = 7 damage. 
    // Wait, since HP started at 100, 100 - 7 = 93. It's still > 0, so player is still alive! 
    // Let's assert player.hp is 93.
    expect(mockPlayer.hp).toBe(93);
    expect(mockRoom.applyDamage).not.toHaveBeenCalled();

    // 3. Now let's tick enough to kill them (e.g. 3000ms more)
    // 35.0 DPS * 3.0s = 105 damage. Since HP is 93, they will die.
    enforcer.tick(mockRoom as any, 3000);
    expect(mockPlayer.hp).toBe(0);
    expect(mockRoom.applyDamage).toHaveBeenCalledWith('P1', 9999, 'fall', '0', 'environment');
    expect(enforcer.getPlayerOOBTime('P1')).toBe(0);
  });

  it('should apply continuous gate damage immediately to players in restricted gates', () => {
    const enforcer = new OutOfBoundsEnforcer();
    const registry = new ZoneRegistry();
    registry.loadFromSpec({
      restrictedGates: [
        { id: 'gate_alpha', position: { x: 144, z: 496 }, killZoneRadius: 10 }
      ]
    });

    const mockChannel = {
      emit: vi.fn(),
    };

    const mockPlayer = {
      id: 'P1',
      isAlive: true,
      hp: 100,
      posX: 144, // inside Courtyard (valid zone) AND inside gate_alpha
      posZ: 496,
      godMode: false,
      channel: mockChannel as any,
    };

    const mockRoom = {
      zoneRegistry: registry,
      players: new Map([['P1', mockPlayer as any]]),
      applyDamage: vi.fn(),
    };

    // Tick for 2.0 seconds
    enforcer.tick(mockRoom as any, 2000);

    // 35.0 DPS * 2.0s = 70.0 damage. HP should be 30.0.
    expect(mockPlayer.hp).toBe(30);
    expect(mockChannel.emit).toHaveBeenCalledWith('reliable_event', {
      type: 'GATE_DAMAGE',
      damage: 70,
      currentHp: 30,
    });
    expect(mockRoom.applyDamage).not.toHaveBeenCalled();
  });

  it('should reset player state when resetPlayer is called or they return to bounds', () => {
    const enforcer = new OutOfBoundsEnforcer();
    const registry = new ZoneRegistry();

    const mockChannel = {
      emit: vi.fn(),
    };

    const mockPlayer = {
      id: 'P1',
      isAlive: true,
      hp: 100,
      posX: 9999,
      posZ: 9999,
      godMode: false,
      channel: mockChannel as any,
    };

    const mockRoom = {
      zoneRegistry: registry,
      players: new Map([['P1', mockPlayer as any]]),
      applyDamage: vi.fn(),
    };

    enforcer.tick(mockRoom as any, 1000);
    expect(enforcer.getPlayerOOBTime('P1')).toBe(1000);

    // Move player back in bounds (Courtyard)
    mockPlayer.posX = 144;
    mockPlayer.posZ = 496;

    enforcer.tick(mockRoom as any, 1000);
    expect(enforcer.getPlayerOOBTime('P1')).toBe(0);
  });
});
