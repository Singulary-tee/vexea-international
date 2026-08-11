/**
 * EnvironmentalEffects.ts
 * Non-monolithic environmental particles, explosions, dust, and smoke systems.
 */
import * as THREE from "three";

export interface EnvironmentalParticle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  color: THREE.Color;
  size: number;
  life: number;
  maxLife: number;
}

export class EnvironmentalEffects {
  private scene: THREE.Scene;
  private particleGeo: THREE.BufferGeometry;
  private particleMat: THREE.PointsMaterial;
  private particlePoints: THREE.Points;
  private particles: EnvironmentalParticle[] = [];
  private maxParticles = 500;

  private positions: Float32Array;
  private colors: Float32Array;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.positions = new Float32Array(this.maxParticles * 3);
    this.colors = new Float32Array(this.maxParticles * 3);

    this.particleGeo = new THREE.BufferGeometry();
    this.particleGeo.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    this.particleGeo.setAttribute("color", new THREE.BufferAttribute(this.colors, 3));

    this.particleMat = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.particlePoints = new THREE.Points(this.particleGeo, this.particleMat);
    this.particlePoints.frustumCulled = false;
    this.scene.add(this.particlePoints);
  }

  public spawnExplosion(center: THREE.Vector3, count = 30) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 2,
        (Math.random() - 0.5) * 2
      ).normalize();

      const speed = 2 + Math.random() * 8;
      this.particles.push({
        pos: center.clone(),
        vel: dir.multiplyScalar(speed),
        color: new THREE.Color().setHSL(0.05 + Math.random() * 0.08, 1.0, 0.5),
        size: 0.2 + Math.random() * 0.4,
        life: 0,
        maxLife: 0.5 + Math.random() * 0.5,
      });
    }
  }

  public update(dt: number) {
    let activeCount = 0;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      p.pos.addScaledVector(p.vel, dt);
      p.vel.y -= 9.8 * dt; // gravity

      const idx = activeCount * 3;
      this.positions[idx] = p.pos.x;
      this.positions[idx + 1] = p.pos.y;
      this.positions[idx + 2] = p.pos.z;

      const fade = 1.0 - p.life / p.maxLife;
      this.colors[idx] = p.color.r * fade;
      this.colors[idx + 1] = p.color.g * fade;
      this.colors[idx + 2] = p.color.b * fade;

      activeCount++;
    }

    // Zero out unused positions
    for (let i = activeCount * 3; i < this.maxParticles * 3; i++) {
      this.positions[i] = 0;
      this.colors[i] = 0;
    }

    this.particleGeo.attributes.position.needsUpdate = true;
    this.particleGeo.attributes.color.needsUpdate = true;
  }

  public dispose() {
    this.scene.remove(this.particlePoints);
    this.particleGeo.dispose();
    this.particleMat.dispose();
    this.particles = [];
  }
}
