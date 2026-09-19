import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
type CoverRecord = { id: string; size: { x: number; y: number; z: number } };
type AddCoverMesh = (mesh: THREE.Mesh, role: string, surface: "body" | "steel" | "warning") => void;

export function addPressureYardCoverRhythm({ record, add }: { record: CoverRecord; add: AddCoverMesh }) {
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x8f9289, roughness: 0.96, metalness: 0.025 });
  const steelMaterial = new THREE.MeshStandardMaterial({ color: 0x334342, roughness: 0.58, metalness: 0.72 });
  const warningMaterial = new THREE.MeshStandardMaterial({ color: 0xb47b3f, roughness: 0.72, metalness: 0.2 });
  const cadence: Array<{ x: number; z: number; rotation: number; width: number }> = [
    { x: -4, z: -4, rotation: -0.02, width: 10.0 },
    { x: 8, z: 0, rotation: 0.015, width: 10.4 },
    { x: 20, z: 4, rotation: 0.04, width: 9.6 },
  ];
  cadence.forEach((piece, index) => {
    const body = new THREE.Mesh(new RoundedBoxGeometry(piece.width, 1.42, 2.2, 6, 0.22), bodyMaterial);
    body.position.set(piece.x, 0.72, piece.z);
    body.rotation.y = piece.rotation;
    add(body, `jersey_piece_${index + 1}_profiled_body`, "body");

    const cap = new THREE.Mesh(new RoundedBoxGeometry(piece.width - 0.34, 0.12, 1.64, 4, 0.05), steelMaterial);
    cap.position.set(piece.x, 1.48, piece.z - 0.02);
    cap.rotation.y = piece.rotation;
    add(cap, `jersey_piece_${index + 1}_steel_cap`, "steel");

    for (const side of [-1, 1]) {
      const shoulder = new THREE.Mesh(new RoundedBoxGeometry(0.34, 1.06, 2.54, 4, 0.08), steelMaterial);
      shoulder.position.set(piece.x + side * (piece.width / 2 - 0.32), 0.58, piece.z);
      shoulder.rotation.y = piece.rotation;
      add(shoulder, `jersey_piece_${index + 1}_end_shoulder_${side < 0 ? "a" : "b"}`, "steel");
    }

    const frontGrime = new THREE.Mesh(new RoundedBoxGeometry(piece.width - 0.9, 0.16, 0.09, 3, 0.025), new THREE.MeshStandardMaterial({ color: 0x515853, roughness: 0.98, metalness: 0.02 }));
    frontGrime.position.set(piece.x, 0.17, piece.z + 1.12);
    frontGrime.rotation.y = piece.rotation;
    add(frontGrime, `jersey_piece_${index + 1}_grounded_front_grime_line`, "body");
    const centerJoint = new THREE.Mesh(new RoundedBoxGeometry(0.11, 1.08, 0.06, 3, 0.02), new THREE.MeshStandardMaterial({ color: 0x6c726b, roughness: 0.98, metalness: 0.02 }));
    centerJoint.position.set(piece.x + 0.65, 0.74, piece.z + 1.12);
    centerJoint.rotation.y = piece.rotation;
    add(centerJoint, `jersey_piece_${index + 1}_front_cast_joint`, "body");
    for (const loopX of [piece.x - piece.width * 0.24, piece.x + piece.width * 0.24]) {
      const liftingLoop = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.045, 8, 16, Math.PI), steelMaterial);
      liftingLoop.position.set(loopX, 1.62, piece.z + 1.13);
      liftingLoop.rotation.y = piece.rotation;
      add(liftingLoop, `jersey_piece_${index + 1}_lifting_loop`, "steel");
    }

    const warningBand = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.32, 1.86, 3, 0.03), warningMaterial);
    warningBand.position.set(piece.x - piece.width * 0.22, 0.82, piece.z - 1.13);
    warningBand.rotation.y = piece.rotation;
    add(warningBand, `jersey_piece_${index + 1}_warning_edge`, "warning");
  });
}
