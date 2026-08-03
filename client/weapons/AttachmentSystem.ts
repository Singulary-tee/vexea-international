import * as THREE from "three/webgpu";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import { createConfiguredGLTFLoader, getCachedOrFetchUrl } from "../asset-cache";

export type ScopeType = 'NONE' | 'HOLOSIGHT' | 'ACOG' | 'ATACR';

let attachmentsModel: THREE.Group | null = null;
const scopeTemplates = new Map<ScopeType, THREE.Object3D>();

// Helper to dispose of geometries and materials on removed elements to avoid WebGPU memory leaks
export function disposeHierarchy(obj: THREE.Object3D) {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      if (child.geometry) {
        child.geometry.dispose();
      }
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
  });
}

/**
 * Preloads and parses the attachments-optimized.glb file, extracting scope templates.
 */
export async function preloadAttachments(): Promise<void> {
  if (attachmentsModel) return;

  try {
    const url = await getCachedOrFetchUrl("attachments-optimized.glb", "Asset");
    const loader = createConfiguredGLTFLoader();
    const gltf = await loader.loadAsync(url);
    
    attachmentsModel = gltf.scene as THREE.Group;
    attachmentsModel.updateMatrixWorld(true);

    // Extract sub-mesh templates based on glb_nodes_report.txt structures
    const holosight = attachmentsModel.getObjectByName("Holosight_512");
    if (holosight) {
      scopeTemplates.set('HOLOSIGHT', holosight);
    } else {
      console.warn("[AttachmentSystem] Holosight_512 not found in attachments glb");
    }

    const acog = attachmentsModel.getObjectByName("sk_optic_acog_rds");
    if (acog) {
      scopeTemplates.set('ACOG', acog);
    } else {
      console.warn("[AttachmentSystem] sk_optic_acog_rds not found in attachments glb");
    }

    const atacr = attachmentsModel.getObjectByName("sm_optic_atacr18");
    if (atacr) {
      scopeTemplates.set('ATACR', atacr);
    } else {
      console.warn("[AttachmentSystem] sm_optic_atacr18 not found in attachments glb");
    }

    console.log("[AttachmentSystem] Preloaded scopes successfully:", Array.from(scopeTemplates.keys()));
  } catch (err) {
    console.error("[AttachmentSystem] Failed to preload attachments-optimized.glb:", err);
  }
}

/**
 * Removes and disposes of any currently active attachments on the weapon.
 */
export function clearAttachments(weapon: THREE.Object3D): void {
  const toRemove: THREE.Object3D[] = [];
  weapon.traverse((child) => {
    if (child.userData && child.userData.isAttachment) {
      toRemove.push(child);
    }
  });

  toRemove.forEach((attachment) => {
    if (attachment.parent) {
      attachment.parent.remove(attachment);
    }
    disposeHierarchy(attachment);
  });
}

/**
 * Finds the correct socket bone on the weapon for the given scope type.
 */
function findSocketBone(weapon: THREE.Object3D, scopeType: ScopeType): THREE.Object3D | null {
  let targetPattern = "";
  if (scopeType === 'HOLOSIGHT') targetPattern = "exps3_socket";
  else if (scopeType === 'ACOG') targetPattern = "sdr_socket";
  else if (scopeType === 'ATACR') targetPattern = "atac_socket";

  let foundSocket: THREE.Object3D | null = null;
  
  // 1. Attempt exact pattern match
  weapon.traverse((child) => {
    if (!foundSocket && child.name.toLowerCase().includes(targetPattern)) {
      foundSocket = child;
    }
  });

  // 2. Fallback to any generic rail socket if pattern not found
  if (!foundSocket) {
    weapon.traverse((child) => {
      const nameLower = child.name.toLowerCase();
      if (!foundSocket && (nameLower.includes("socket") || nameLower.includes("rail")) && !nameLower.includes("mag") && !nameLower.includes("muzzle") && !nameLower.includes("grip")) {
        foundSocket = child;
      }
    });
  }

  return foundSocket;
}

/**
 * Mounts a cloned scope attachment onto the target weapon model's socket bone.
 */
export async function attachScope(
  weapon: THREE.Object3D,
  scopeType: ScopeType
): Promise<THREE.Object3D | null> {
  // Ensure we are preloaded
  if (!attachmentsModel) {
    await preloadAttachments();
  }

  // 1. Remove any existing scopes first (mutual exclusion)
  clearAttachments(weapon);

  if (scopeType === 'NONE') {
    return null;
  }

  const template = scopeTemplates.get(scopeType);
  if (!template) {
    console.warn(`[AttachmentSystem] No template cached for scope type: ${scopeType}`);
    return null;
  }

  const socketBone = findSocketBone(weapon, scopeType);
  if (!socketBone) {
    console.warn(`[AttachmentSystem] No suitable rail socket bone found on weapon model: ${weapon.name}`);
    return null;
  }

  // 2. Clone the template scene hierarchy safely
  const scopeClone = SkeletonUtils.clone(template) as THREE.Object3D;
  scopeClone.userData.isAttachment = true;
  scopeClone.userData.attachmentType = scopeType;

  // Make sure the clone is visible and resets its local transform to snap perfectly to socket space
  scopeClone.visible = true;
  scopeClone.position.set(0, 0, 0);
  scopeClone.rotation.set(0, 0, 0);
  scopeClone.scale.set(1, 1, 1);

  // 3. Mount directly as a child of the socket bone
  socketBone.add(scopeClone);
  
  // Ensure matrix propagation
  weapon.updateMatrixWorld(true);

  console.log(`[AttachmentSystem] Successfully mounted ${scopeType} scope onto socket bone: ${socketBone.name}`);
  return scopeClone;
}
