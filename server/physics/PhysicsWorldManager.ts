import RAPIER from "@dimforge/rapier3d-compat";

export class PhysicsWorldManager {
  public rapierWorld!: RAPIER.World;
  private colliders: RAPIER.Collider[] = [];
  private staticBody: RAPIER.RigidBody | null = null;

  constructor(private specJson: any) {}

  public initPhysics() {
    this.colliders = [];
    this.rapierWorld = new RAPIER.World({ x: 0.0, y: -9.81, z: 0.0 });

    // Static body for all fixed geometry
    const staticBodyDesc = RAPIER.RigidBodyDesc.fixed();
    this.staticBody = this.rapierWorld.createRigidBody(staticBodyDesc);

    // Map Boundaries
    const wall1Desc = RAPIER.ColliderDesc.cuboid(384, 20, 1).setTranslation(384, 10, 768);
    const wall1 = this.rapierWorld.createCollider(wall1Desc, this.staticBody);
    if (wall1) this.colliders.push(wall1);

    const wall2Desc = RAPIER.ColliderDesc.cuboid(384, 20, 1).setTranslation(384, 10, 0);
    const wall2 = this.rapierWorld.createCollider(wall2Desc, this.staticBody);
    if (wall2) this.colliders.push(wall2);

    const wall3Desc = RAPIER.ColliderDesc.cuboid(1, 20, 384).setTranslation(768, 10, 384);
    const wall3 = this.rapierWorld.createCollider(wall3Desc, this.staticBody);
    if (wall3) this.colliders.push(wall3);

    const wall4Desc = RAPIER.ColliderDesc.cuboid(1, 20, 384).setTranslation(0, 10, 384);
    const wall4 = this.rapierWorld.createCollider(wall4Desc, this.staticBody);
    if (wall4) this.colliders.push(wall4);

    // World Floor Boundary
    const floorDesc = RAPIER.ColliderDesc.cuboid(500, 0.5, 500).setTranslation(384, -0.5, 384);
    const floor = this.rapierWorld.createCollider(floorDesc, this.staticBody);
    if (floor) this.colliders.push(floor);

    // Actual map buildings
    if (this.specJson && this.specJson.buildings) {
      for (const b of this.specJson.buildings) {
        let sizeX = b.size.x || 10;
        let sizeZ = b.size.z || 10;
        const angleRad = b.rotation && b.rotation.y ? (b.rotation.y * Math.PI) / 180 : 0;
        if (Math.abs(Math.sin(angleRad)) > 0.707) {
          const temp = sizeX;
          sizeX = sizeZ;
          sizeZ = temp;
        }
        const halfX = sizeX / 2;
        const halfY = (b.size.y || 10) / 2;
        const halfZ = sizeZ / 2;
        const desc = RAPIER.ColliderDesc.cuboid(halfX, halfY, halfZ)
          .setTranslation(b.position.x, b.position.y + halfY, b.position.z);
        const buildingCollider = this.rapierWorld.createCollider(desc, this.staticBody);
        if (buildingCollider) this.colliders.push(buildingCollider);
      }
    }
  }

  public destroy(): void {
    if (!this.rapierWorld) return;
    for (const collider of this.colliders) {
      try {
        if (typeof this.rapierWorld.removeCollider === "function") {
          this.rapierWorld.removeCollider(collider, false);
        }
      } catch (e) {}
    }
    this.colliders = [];
    if (this.staticBody) {
      try {
        if (typeof this.rapierWorld.removeRigidBody === "function") {
          this.rapierWorld.removeRigidBody(this.staticBody);
        }
      } catch (e) {}
      this.staticBody = null;
    }
    try {
      if (typeof this.rapierWorld.free === "function") {
        this.rapierWorld.free();
      }
    } catch (e) {
      console.error("[PhysicsWorldManager] Error freeing rapierWorld:", e);
    }
    (this as any).rapierWorld = null;
  }
}
