import * as THREE from "three/webgpu";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

export interface WeaponSkin {
  id: string;
  name: string;
  color?: string;       // Hex color code for standard base
  emissive?: string;    // Emissive glowing color
  metalness?: number;   // Metallic quality
  roughness?: number;   // Smoothness
  patternType?: "none" | "stripe";
}

export const WEAPON_SKINS: Record<string, WeaponSkin> = {
  STANDARD: { id: "STANDARD", name: "STANDARD FINISH", metalness: 0.4, roughness: 0.5, patternType: "none" },
  test_skin: { id: "test_skin", name: "TEST COATING", color: "#112244", emissive: "#00aaff", metalness: 0.8, roughness: 0.2, patternType: "stripe" }
};

/**
 * Creates dynamic high-quality procedural texture map canvas on demand.
 */
function createProceduralTexture(type: "stripe" | "none"): THREE.Texture | null {
  if (type === "none") return null;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  if (type === "stripe") {
    // High-contrast sharp black and cyan/blue tech stripes
    ctx.fillStyle = "#112244";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#00aaff";
    ctx.beginPath();
    for (let i = -size; i < size * 2; i += 40) {
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 20, 0);
      ctx.lineTo(i + 40, size);
      ctx.lineTo(i + 20, size);
      ctx.closePath();
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

/**
 * ClassLoadoutSystem: Centralized weapon config, custom procedural skin application,
 * model centering, character attachment, and LocalStorage + Firebase persistence.
 */
export class ClassLoadoutSystem {
  
  /**
   * Applies a procedural weapon skin configuration to a 3D model hierarchy.
   */
  public static applySkin(model: THREE.Object3D, skinId: string): void {
    const skin = WEAPON_SKINS[skinId] || WEAPON_SKINS.STANDARD;
    
    let patternTexture: THREE.Texture | null = null;
    if (skin.patternType && skin.patternType !== "none") {
      patternTexture = createProceduralTexture(skin.patternType);
    }

    model.traverse((child: any) => {
      if (child.isMesh && child.material) {
        // Clone original material to prevent affecting other instances
        if (!child.userData.originalMaterial) {
          child.userData.originalMaterial = child.material.clone();
        }

        const mat = child.userData.originalMaterial.clone();

        if (skin.id === "STANDARD") {
          child.material = child.userData.originalMaterial;
          return;
        }

        // Apply skin modifications
        if (skin.color) {
          mat.color.set(skin.color);
        }
        if (skin.emissive) {
          mat.emissive.set(skin.emissive);
          mat.emissiveIntensity = 2.5;
        } else {
          mat.emissive.set("#000000");
          mat.emissiveIntensity = 0;
        }
        if (skin.metalness !== undefined) mat.metalness = skin.metalness;
        if (skin.roughness !== undefined) mat.roughness = skin.roughness;
        
        if (patternTexture) {
          mat.map = patternTexture;
        } else {
          mat.map = child.userData.originalMaterial.map;
        }

        mat.needsUpdate = true;
        child.material = mat;
      }
    });
  }

  /**
   * Retrieves correct meshes belonging purely to the weapon assembly, skipping character bodies and limbs.
   */
  public static getWeaponMeshes(model: THREE.Object3D): THREE.Mesh[] {
    const weaponMeshes: THREE.Mesh[] = [];
    model.traverse((child: any) => {
      if (child.isMesh && child.visible) {
        const name = child.name.toLowerCase();
        if (!name.includes("arm") && !name.includes("hand") && !name.includes("sleeve") && !name.includes("body") && !name.includes("character") && !name.includes("player")) {
          weaponMeshes.push(child);
        }
      }
    });
    if (weaponMeshes.length === 0) {
      model.traverse((child: any) => {
        if (child.isMesh && child.visible) {
          weaponMeshes.push(child);
        }
      });
    }
    return weaponMeshes;
  }

  /**
   * Standardizes orientation, scales and positions a weapon model to center perfectly around its bounds.
   */
  public static centerAndScaleWeapon(model: THREE.Object3D, targetSize: number = 0.7): void {
    // Reset any prior translations
    model.position.set(0, 0, 0);
    model.scale.set(1.0, 1.0, 1.0);
    model.rotation.set(0, 0, 0);
    model.updateMatrixWorld(true);

    const meshes = this.getWeaponMeshes(model);
    const box = new THREE.Box3();

    meshes.forEach(mesh => {
      mesh.updateMatrixWorld(true);
      const geom = mesh.geometry;
      if (geom) {
        if (!geom.boundingBox) geom.computeBoundingBox();
        if (geom.boundingBox) {
          const tempBox = geom.boundingBox.clone();
          tempBox.applyMatrix4(mesh.matrixWorld);
          box.union(tempBox);
        }
      }
    });

    if (!box.isEmpty()) {
      const center = new THREE.Vector3();
      box.getCenter(center);

      const size = new THREE.Vector3();
      box.getSize(size);

      const maxDim = Math.max(size.x, size.y, size.z);
      const scaleFactor = targetSize / (maxDim || 1.0);

      // Shift position and scale uniformly
      model.scale.set(scaleFactor, scaleFactor, scaleFactor);
      model.position.copy(center).negate().multiplyScalar(scaleFactor);
      model.updateMatrixWorld(true);
    }
  }

  /**
   * Persists equipped skin in LocalStorage and Firestore.
   */
  public static async equipSkin(itemId: string, skinId: string): Promise<void> {
    const saved = this.getAllEquippedSkins();
    saved[itemId] = skinId;
    localStorage.setItem("vex_armory_item_skins", JSON.stringify(saved));

    // Save to Firestore if authenticated
    try {
      const auth = getAuth();
      if (auth.currentUser) {
        const db = getFirestore();
        await updateDoc(doc(db, "Users", auth.currentUser.uid), {
          "armory.itemSkins": saved
        });
      }
    } catch (e) {
      console.warn("[ClassLoadoutSystem] Failed to persist skin to Firestore:", e);
    }
  }

  /**
   * Retrieves the currently selected skin ID for a weapon item.
   */
  public static getEquippedSkin(itemId: string): string {
    const saved = this.getAllEquippedSkins();
    return saved[itemId] || "STANDARD";
  }

  private static getAllEquippedSkins(): Record<string, string> {
    try {
      return JSON.parse(localStorage.getItem("vex_armory_item_skins") || "{}");
    } catch {
      return {};
    }
  }
}
