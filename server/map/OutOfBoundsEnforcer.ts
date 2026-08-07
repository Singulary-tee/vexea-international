import { MatchRoom } from "../MatchRoom";

export class OutOfBoundsEnforcer {
  private playerOOBTime: Map<string, number> = new Map();

  /**
   * Ticks the out-of-bounds and restricted gate checks for all active players.
   * @param room The active MatchRoom instance.
   * @param deltaTimeMs The elapsed time since last tick in milliseconds.
   */
  public tick(room: MatchRoom, deltaTimeMs: number): void {
    if (!room.zoneRegistry) return;

    for (const player of room.players.values()) {
      if (!player.isAlive || player.godMode) {
        this.playerOOBTime.delete(player.id);
        continue;
      }

      const inZone = room.zoneRegistry.getZoneAtPosition(player.posX, player.posZ) !== null;
      const inRestrictedGate = room.zoneRegistry.isInRestrictedGate(player.posX, player.posZ);

      // Handle Out-of-Bounds (Outside all defined zones)
      if (!inZone) {
        let oobMs = this.playerOOBTime.get(player.id) || 0;
        oobMs += deltaTimeMs;
        this.playerOOBTime.set(player.id, oobMs);

        const remainingSeconds = Math.max(0, (3000 - oobMs) / 1000);

        // Broadcast warning to player's channel
        if (player.channel) {
          player.channel.emit("reliable_event", {
            type: "out_of_bounds_warning",
            remainingSeconds: parseFloat(remainingSeconds.toFixed(2)),
          });
        }

        // Apply damage after 3.0 second grace period
        if (oobMs >= 3000) {
          const damage = 35.0 * (deltaTimeMs / 1000.0);
          player.hp -= damage;
          if (player.hp <= 0) {
            player.hp = 0;
            this.playerOOBTime.delete(player.id);
            room.applyDamage(player.id, 9999, "fall", "0", "environment");
          } else {
            if (player.channel) {
              player.channel.emit("reliable_event", {
                type: "OOB_DAMAGE",
                damage: parseFloat(damage.toFixed(4)),
                currentHp: parseFloat(player.hp.toFixed(4)),
              });
            }
          }
        }
      } else {
        // Player is back inside bounds
        this.playerOOBTime.delete(player.id);
      }

      // Handle Restricted Gate Damage (Immediate continuous 35.0 DPS)
      if (inRestrictedGate) {
        const damage = 35.0 * (deltaTimeMs / 1000.0);
        player.hp -= damage;
        if (player.hp <= 0) {
          player.hp = 0;
          room.applyDamage(player.id, 9999, "explosion", "0", "environment");
        } else {
          if (player.channel) {
            player.channel.emit("reliable_event", {
              type: "GATE_DAMAGE",
              damage: parseFloat(damage.toFixed(4)),
              currentHp: parseFloat(player.hp.toFixed(4)),
            });
          }
        }
      }
    }
  }

  /**
   * Resets tracking state for a single player when they leave or respawn.
   */
  public resetPlayer(playerId: string): void {
    this.playerOOBTime.delete(playerId);
  }

  /**
   * Gets the tracked OOB time in milliseconds for a player (useful for tests).
   */
  public getPlayerOOBTime(playerId: string): number {
    return this.playerOOBTime.get(playerId) || 0;
  }
}
