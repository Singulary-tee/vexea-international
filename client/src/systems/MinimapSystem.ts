import * as THREE from "three";
import { MatchController } from "../../MatchController";
import { DroneState, ZONE_BOUNDS, WAYPOINTS } from "../../../shared/constants";
import { PanZoomSurface } from "../ui/PanZoomSurface";
import { DS } from "../../design-system";

export class MinimapSystem {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private playerArrow: HTMLElement | null = null;
  private match: MatchController;
  
  private rangeX = 160;
  private rangeZ = 300;

  private panZoom: PanZoomSurface | null = null;
  private zoom = 1.0;
  private panX = 0;
  private panY = 0;

  // Static Caching Fields
  private staticCanvas: HTMLCanvasElement | null = null;
  private staticCtx: CanvasRenderingContext2D | null = null;
  private lastSpec: any = null;
  private lastIsFS = false;
  private lastW = 0;
  private lastH = 0;
  private lastScale = 0;
  private lastOffsetX = 0;
  private lastOffsetY = 0;

  // Dynamic Markers Caching (20Hz / 50ms)
  private cachedMarkers: Array<{ dx: number; dz: number; color: string; isPlayer?: boolean }> = [];
  private lastMarkerUpdate = 0;

  constructor(match: MatchController) {
    this.match = match;
    this.canvas = document.getElementById("minimap-canvas") as HTMLCanvasElement;
    if (this.canvas) {
      this.ctx = this.canvas.getContext("2d");
    }
    this.playerArrow = document.getElementById("minimap-player-arrow");
  }

  private isFullscreen(): boolean {
    const container = document.getElementById("minimap-container");
    return !!(container && container.classList.contains("fullscreen-minimap"));
  }

  private renderStaticMap(
    spec: any,
    isFS: boolean,
    w: number,
    h: number,
    scale: number,
    offsetX: number,
    offsetY: number,
    mapW: number,
    mapH: number
  ) {
    if (!this.staticCanvas) {
      this.staticCanvas = document.createElement("canvas");
    }
    this.staticCanvas.width = w;
    this.staticCanvas.height = h;
    const ctx = this.staticCanvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, this.staticCanvas.width, this.staticCanvas.height);

    // Facility boundary background & border
    ctx.fillStyle = DS.utils.rgba(DS.colors.surface, 0.4);
    ctx.fillRect(offsetX, offsetY, mapW, mapH);
    ctx.strokeStyle = DS.glass.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(offsetX, offsetY, mapW, mapH);

    // 1. Draw Zones
    if (spec.zones) {
      for (const zone of spec.zones) {
        if (!zone || !zone.bounds) continue;
        const zWidth = zone.bounds.xMax - zone.bounds.xMin;
        const zHeight = zone.bounds.zMax - zone.bounds.zMin;
        
        const zx = offsetX + zone.bounds.xMin * scale;
        const zz = offsetY + zone.bounds.zMin * scale;
        const zw = zWidth * scale;
        const zh = zHeight * scale;
        
        ctx.fillStyle = DS.utils.rgba(DS.colors.surface, 0.25);
        ctx.strokeStyle = DS.glass.border;
        ctx.lineWidth = 1;
        ctx.fillRect(zx, zz, zw, zh);
        ctx.strokeRect(zx, zz, zw, zh);
      }
    }

    // 2. Draw Buildings
    if (spec.buildings) {
      for (const b of spec.buildings) {
        if (!b || !b.position || !b.size) continue;
        const bx = offsetX + b.position.x * scale;
        const bz = offsetY + b.position.z * scale;
        const bw = b.size.x * (b.scale?.x || 1) * scale;
        const bh = b.size.z * (b.scale?.z || 1) * scale;

        ctx.fillStyle = DS.utils.rgba(DS.colors.textMuted, 0.35);
        ctx.strokeStyle = DS.utils.rgba(DS.colors.text, 0.4);
        ctx.lineWidth = 0.5;

        ctx.save();
        ctx.translate(bx, bz);
        if (b.rotation?.y) {
          ctx.rotate((-b.rotation.y * Math.PI) / 180);
        }
        ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
        ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);
        ctx.restore();
      }
    }
  }

  public update(dt: number, spec: any) {
    if (!this.canvas || !document.body.contains(this.canvas)) {
      this.canvas = document.getElementById("minimap-canvas") as HTMLCanvasElement;
      if (this.canvas) {
        this.ctx = this.canvas.getContext("2d");
      }
      this.playerArrow = document.getElementById("minimap-player-arrow");
    }
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const mmCanvas = this.canvas;

    const isFS = this.isFullscreen();

    // Manage PanZoomSurface instance on-demand
    if (isFS) {
      if (!this.panZoom) {
        this.panZoom = new PanZoomSurface(mmCanvas, {
          initialZoom: 1.0,
          initialPanX: 0,
          initialPanY: 0,
          minZoom: 0.5,
          maxZoom: 5.0,
          onChange: (z, px, py) => {
            this.zoom = z;
            this.panX = px;
            this.panY = py;
          }
        });
      }
    } else {
      if (this.panZoom) {
        this.panZoom.destroy();
        this.panZoom = null;
        this.zoom = 1.0;
        this.panX = 0;
        this.panY = 0;
      }
    }

    const dpr = window.devicePixelRatio || 1;
    const rect = mmCanvas.getBoundingClientRect();
    const w = rect.width > 0 ? rect.width : 300;
    const h = rect.height > 0 ? rect.height : 300;
    const targetW = w * dpr;
    const targetH = h * dpr;
    
    if (mmCanvas.width !== targetW) mmCanvas.width = targetW;
    if (mmCanvas.height !== targetH) mmCanvas.height = targetH;

    ctx.clearRect(0, 0, mmCanvas.width, mmCanvas.height);
    
    ctx.save();
    ctx.scale(dpr, dpr);
    
    const cx = w / 2;
    const cy = h / 2;
    
    const px = this.match?.playerPos ? this.match.playerPos.x : ((window as any).camera?.position.x || 0);
    const pz = this.match?.playerPos ? this.match.playerPos.z : ((window as any).camera?.position.z || 0);
    const playerYaw = this.match?.playerYaw ?? ((window as any).getPlayerYaw?.() || 0);

    let scale = 1.0;
    let offsetX = 0;
    let offsetY = 0;
    let mapW = w;
    let mapH = h;

    if (spec && spec.worldSize) {
      const worldX = spec.worldSize.x;
      const worldZ = spec.worldSize.z;
      const padding = isFS ? 24 : 4;
      const availW = Math.max(w - padding * 2, 1);
      const availH = Math.max(h - padding * 2, 1);
      scale = Math.min(availW / worldX, availH / worldZ);
      mapW = worldX * scale;
      mapH = worldZ * scale;
      offsetX = (w - mapW) / 2;
      offsetY = (h - mapH) / 2;
    }

    // Apply Pan and Zoom inside the matrix stack if fullscreen
    ctx.save();
    if (isFS) {
      ctx.translate(this.panX, this.panY);
      // Zoom centered at canvas center
      ctx.translate(cx, cy);
      ctx.scale(this.zoom, this.zoom);
      ctx.translate(-cx, -cy);
    }

    if (spec) {
      // Caching static canvas layer
      if (
        !this.staticCanvas ||
        this.lastSpec !== spec ||
        this.lastIsFS !== isFS ||
        this.lastW !== w ||
        this.lastH !== h ||
        this.lastScale !== scale ||
        this.lastOffsetX !== offsetX ||
        this.lastOffsetY !== offsetY
      ) {
        this.renderStaticMap(spec, isFS, w, h, scale, offsetX, offsetY, mapW, mapH);
        this.lastSpec = spec;
        this.lastIsFS = isFS;
        this.lastW = w;
        this.lastH = h;
        this.lastScale = scale;
        this.lastOffsetX = offsetX;
        this.lastOffsetY = offsetY;
      }

      // Draw Static Canvas
      if (this.staticCanvas) {
        ctx.drawImage(this.staticCanvas, 0, 0);
      }
    }

    // Update dynamic entities at 20Hz (every 50ms)
    const now = performance.now();
    if (now - this.lastMarkerUpdate > 50 || this.cachedMarkers.length === 0) {
      this.lastMarkerUpdate = now;
      this.cachedMarkers.length = 0;
      for (const buffer of this.match.droneJitterMap.values()) {
        if (buffer.count === 0) continue;
        const head = buffer.states[(buffer.head - 1 + 3) % 3];
        if (!head || head.state === DroneState.DEAD) continue;

        let markerColor = DS.colors.textSecondary; // Ground
        if (head.type === 0 || head.type === 1 || head.type === 3) {
          markerColor = DS.colors.accent; // Air
        } else if (head.type === 2) {
          markerColor = DS.colors.warning; // Recon
        }

        this.cachedMarkers.push({
          dx: head.posX,
          dz: head.posZ,
          color: markerColor
        });
      }

      for (const [id, data] of this.match.remotePlayersTargetData.entries()) {
        if (!data || !data.isAlive) continue;
        const isHostile = id.startsWith('bot_') || id.startsWith('ai_');
        const markerColor = isHostile ? '#FF3366' : DS.colors.success;
        this.cachedMarkers.push({
          dx: data.pos.x,
          dz: data.pos.z,
          color: markerColor,
          isPlayer: true
        });
      }
    }

    // 3. Draw Drones and Remote Players from cached markers
    for (const marker of this.cachedMarkers) {
      const dx = offsetX + marker.dx * scale;
      const dz = offsetY + marker.dz * scale;

      ctx.save();
      ctx.shadowColor = marker.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = marker.color;
      ctx.beginPath();
      ctx.arc(dx, dz, marker.isPlayer ? 5.5 : 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = DS.colors.text;
      ctx.lineWidth = marker.isPlayer ? 1.5 : 1;
      ctx.stroke();

      if (marker.isPlayer) {
        ctx.beginPath();
        ctx.arc(dx, dz, 8.5, 0, Math.PI * 2);
        ctx.strokeStyle = marker.color;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.restore();
    }

    ctx.restore(); // Restore Pan and Zoom stack

    // Position HTML Player Arrow
    if (this.playerArrow) {
      this.playerArrow.style.display = "flex";
      this.playerArrow.style.transform = `rotate(${-playerYaw}rad)`;

      const rawX = offsetX + px * scale;
      const rawY = offsetY + pz * scale;

      if (isFS) {
        const screenX = (rawX - cx) * this.zoom + cx + this.panX;
        const screenY = (rawY - cy) * this.zoom + cy + this.panY;
        this.playerArrow.style.left = `${screenX}px`;
        this.playerArrow.style.top = `${screenY}px`;
      } else {
        this.playerArrow.style.left = `${rawX}px`;
        this.playerArrow.style.top = `${rawY}px`;
      }
    }
    
    ctx.restore(); // Restore DPR stack

    // Update dynamic minimap location label
    this.updateMinimapLabel(px, pz);
  }

  private updateMinimapLabel(px: number, pz: number) {
    const labelEl = document.getElementById("minimap-label");
    if (!labelEl) return;

    let currentZone = "";
    if (ZONE_BOUNDS) {
      for (const [zoneKey, bounds] of Object.entries(ZONE_BOUNDS)) {
        if (!bounds) continue;
        const dx = Math.abs(px - bounds.center.x);
        const dz = Math.abs(pz - bounds.center.z);
        if (dx <= bounds.halfSize.x && dz <= bounds.halfSize.z) {
          currentZone = zoneKey.replace("zone_", "").toUpperCase();
          break;
        }
      }
    }

    if (!currentZone && WAYPOINTS) {
      let minDist = Infinity;
      for (const [zoneKey, wp] of Object.entries(WAYPOINTS)) {
        if (!wp) continue;
        const distSq = (px - wp.x) ** 2 + (pz - wp.z) ** 2;
        if (distSq < minDist) {
          minDist = distSq;
          currentZone = zoneKey.replace("zone_", "").toUpperCase();
        }
      }
    }

    if (currentZone) {
      labelEl.innerText = currentZone;
    }
  }

  public dispose() {
    if (this.panZoom) {
      this.panZoom.destroy();
      this.panZoom = null;
    }
    if (this.canvas && this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    if (this.playerArrow) {
        this.playerArrow.style.display = "none";
    }
    this.canvas = null;
    this.ctx = null;
    this.playerArrow = null;
    this.staticCanvas = null;
    this.staticCtx = null;
  }
}
