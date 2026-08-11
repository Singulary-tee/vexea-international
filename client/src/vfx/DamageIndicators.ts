/**
 * DamageIndicators.ts
 * Directional UI hit indicators showing damage origin relative to player camera yaw.
 */
import * as THREE from "three";

export interface DamageOrigin {
  id: string;
  worldPos: THREE.Vector3;
  durationMs: number;
  spawnTimeMs: number;
}

export class DamageIndicators {
  private container: HTMLElement | null = null;
  private origins: Map<string, DamageOrigin> = new Map();

  constructor() {
    this.container = document.getElementById("damage-indicators-overlay");
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.id = "damage-indicators-overlay";
      this.container.style.position = "absolute";
      this.container.style.top = "0";
      this.container.style.left = "0";
      this.container.style.width = "100%";
      this.container.style.height = "100%";
      this.container.style.pointerEvents = "none";
      this.container.style.zIndex = "40";
      document.body.appendChild(this.container);
    }
  }

  public addDamageOrigin(id: string, worldPos: THREE.Vector3, durationMs: number = 1000) {
    this.origins.set(id, {
      id,
      worldPos: worldPos.clone(),
      durationMs,
      spawnTimeMs: performance.now(),
    });
  }

  public update(playerPos: THREE.Vector3, cameraYaw: number) {
    if (!this.container) return;
    const now = performance.now();

    for (const [id, origin] of this.origins.entries()) {
      const elapsed = now - origin.spawnTimeMs;
      if (elapsed >= origin.durationMs) {
        const el = document.getElementById(`dmg-ind-${id}`);
        if (el) el.remove();
        this.origins.delete(id);
        continue;
      }

      // Compute relative angle between player heading and damage source
      const dx = origin.worldPos.x - playerPos.x;
      const dz = origin.worldPos.z - playerPos.z;
      const sourceAngle = Math.atan2(dx, -dz);
      let relAngle = sourceAngle + cameraYaw;
      relAngle = Math.atan2(Math.sin(relAngle), Math.cos(relAngle));

      const alpha = 1.0 - elapsed / origin.durationMs;
      let el = document.getElementById(`dmg-ind-${id}`);
      if (!el) {
        el = document.createElement("div");
        el.id = `dmg-ind-${id}`;
        el.style.position = "absolute";
        el.style.left = "50%";
        el.style.top = "50%";
        el.style.width = "60px";
        el.style.height = "60px";
        el.style.marginLeft = "-30px";
        el.style.marginTop = "-30px";
        el.style.pointerEvents = "none";
        el.innerHTML = `<svg viewBox="0 0 100 100" style="width:100%;height:100%;"><polygon points="50,10 40,40 60,40" fill="#ff3344" opacity="0.8"/></svg>`;
        this.container.appendChild(el);
      }

      const radius = 120; // px offset from center
      const offsetX = Math.sin(relAngle) * radius;
      const offsetY = -Math.cos(relAngle) * radius;
      const deg = (relAngle * 180) / Math.PI;

      el.style.transform = `translate(${offsetX}px, ${offsetY}px) rotate(${deg}deg)`;
      el.style.opacity = alpha.toString();
    }
  }

  public clear() {
    this.origins.clear();
    if (this.container) {
      this.container.innerHTML = "";
    }
  }
}
