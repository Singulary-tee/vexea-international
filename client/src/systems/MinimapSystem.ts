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
  private lastScaleX = 0;
  private lastScaleZ = 0;

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

  private renderStaticMap(spec: any, isFS: boolean, w: number, h: number, scaleX: number, scaleZ: number, cx: number, cy: number, scx: number, scy: number) {
    if (!this.staticCanvas) {
      this.staticCanvas = document.createElement("canvas");
    }
    this.staticCanvas.width = isFS ? w : spec.worldSize.x * scaleX;
    this.staticCanvas.height = isFS ? h : spec.worldSize.z * scaleZ;
    const ctx = this.staticCanvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, this.staticCanvas.width, this.staticCanvas.height);

    const drawCx = isFS ? cx : scx;
    const drawCy = isFS ? cy : scy;

    // 1. Draw Zones
    if (spec.zones) {
      for (const zone of spec.zones) {
        if (!zone || !zone.bounds) continue;
        const zWidth = zone.bounds.xMax - zone.bounds.xMin;
        const zHeight = zone.bounds.zMax - zone.bounds.zMin;
        
        const zx = drawCx + zone.bounds.xMin * scaleX;
        const zz = drawCy + zone.bounds.zMin * scaleZ;
        
        ctx.fillStyle = DS.utils.rgba(DS.colors.surface, 0.2);
        ctx.strokeStyle = DS.glass.border;
        ctx.lineWidth = 1;
        ctx.fillRect(zx, zz, zWidth * scaleX, zHeight * scaleZ);
        ctx.strokeRect(zx, zz, zWidth * scaleX, zHeight * scaleZ);
      }
    }

    // 2. Draw Buildings
    if (spec.buildings) {
      for (const b of spec.buildings) {
        if (!b || !b.position || !b.size) continue;
        const bx = drawCx + b.position.x * scaleX;
        const bz = drawCy + b.position.z * scaleZ;
        const bw = b.size.x * (b.scale?.x || 1) * scaleX;
        const bh = b.size.z * (b.scale?.z || 1) * scaleZ;

        ctx.fillStyle = DS.utils.rgba(DS.colors.textMuted, 0.3);
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
    
    const px = (window as any).camera?.position.x || 0;
    const pz = (window as any).camera?.position.z || 0;
    const playerYaw = (window as any).getPlayerYaw?.() || 0;

    if (this.playerArrow) {
      this.playerArrow.style.display = "flex";
      this.playerArrow.style.transform = `rotate(${-playerYaw}rad)`;
    }

    let scaleX = 1.0;
    let scaleZ = 1.0;

    if (spec) {
      if (isFS) {
        const worldX = spec.worldSize.x;
        const worldZ = spec.worldSize.z;
        const baseScale = Math.min(w / worldX, h / worldZ) * 0.95; // slightly inset to be safe
        scaleX = baseScale;
        scaleZ = baseScale;
      } else {
        const zoomFactor = 2.5;
        this.rangeX = spec.worldSize.x / zoomFactor;
        this.rangeZ = spec.worldSize.z / zoomFactor;
        scaleX = w / this.rangeX;
        scaleZ = h / this.rangeZ;
      }
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
      const scx = (spec.worldSize.x * scaleX) / 2;
      const scy = (spec.worldSize.z * scaleZ) / 2;

      // Caching static canvas layer
      if (
        !this.staticCanvas ||
        this.lastSpec !== spec ||
        this.lastIsFS !== isFS ||
        this.lastW !== w ||
        this.lastH !== h ||
        this.lastScaleX !== scaleX ||
        this.lastScaleZ !== scaleZ
      ) {
        this.renderStaticMap(spec, isFS, w, h, scaleX, scaleZ, cx, cy, scx, scy);
        this.lastSpec = spec;
        this.lastIsFS = isFS;
        this.lastW = w;
        this.lastH = h;
        this.lastScaleX = scaleX;
        this.lastScaleZ = scaleZ;
      }

      // Draw Static Canvas
      if (this.staticCanvas) {
        if (isFS) {
          ctx.drawImage(this.staticCanvas, 0, 0);
        } else {
          ctx.drawImage(this.staticCanvas, cx - scx - px * scaleX, cy - scy - pz * scaleZ);
        }
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
      const dx = cx + (marker.dx - (isFS ? 0 : px)) * scaleX;
      const dz = cy + (marker.dz - (isFS ? 0 : pz)) * scaleZ;

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
      if (isFS) {
        // Calculate player screen position under Pan & Zoom
        const worldX_scaled = px * scaleX;
        const worldZ_scaled = pz * scaleZ;
        
        const screenX = (worldX_scaled) * this.zoom + this.panX + cx;
        const screenY = (worldZ_scaled) * this.zoom + this.panY + cy;
        
        this.playerArrow.style.left = `${screenX}px`;
        this.playerArrow.style.top = `${screenY}px`;
      } else {
        this.playerArrow.style.left = "50%";
        this.playerArrow.style.top = "50%";
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
