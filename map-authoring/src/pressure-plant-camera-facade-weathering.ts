import * as THREE from "three";
import type { PressurePlantSliceDetail } from "./pressure-plant-slice-details";

function createFacadeWeatheringTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1400;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to create plant facade weathering texture");
  context.clearRect(0, 0, canvas.width, canvas.height);

  let seed = 14073;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const lowerWash = context.createLinearGradient(0, canvas.height * 0.68, 0, canvas.height);
  lowerWash.addColorStop(0, "rgba(21, 29, 28, 0)");
  lowerWash.addColorStop(0.34, "rgba(24, 31, 29, 0.16)");
  lowerWash.addColorStop(1, "rgba(17, 24, 24, 0.46)");
  context.fillStyle = lowerWash;
  context.fillRect(0, canvas.height * 0.58, canvas.width, canvas.height * 0.42);

  for (let index = 0; index < 26; index += 1) {
    const x = 12 + random() * (canvas.width - 24);
    const startY = random() * canvas.height * 0.48;
    const length = 72 + random() * 265;
    const width = 2 + random() * 8;
    const stain = context.createLinearGradient(x, startY, x + (random() - 0.5) * 14, Math.min(canvas.height, startY + length));
    stain.addColorStop(0, `rgba(24, 32, 31, ${0.08 + random() * 0.12})`);
    stain.addColorStop(0.58, `rgba(34, 42, 40, ${0.04 + random() * 0.09})`);
    stain.addColorStop(1, "rgba(30, 38, 37, 0)");
    context.save();
    context.translate(x, startY);
    context.rotate((random() - 0.5) * 0.035);
    context.fillStyle = stain;
    context.fillRect(-width / 2, 0, width, length);
    context.restore();
  }

  for (let index = 0; index < 18; index += 1) {
    const x = random() * canvas.width;
    const y = canvas.height * (0.36 + random() * 0.56);
    const radiusX = 18 + random() * 88;
    const radiusY = 8 + random() * 32;
    const patch = context.createRadialGradient(x, y, 2, x, y, radiusX);
    patch.addColorStop(0, `rgba(15, 23, 23, ${0.07 + random() * 0.1})`);
    patch.addColorStop(0.7, `rgba(32, 40, 38, ${0.03 + random() * 0.05})`);
    patch.addColorStop(1, "rgba(20, 28, 27, 0)");
    context.fillStyle = patch;
    context.beginPath();
    context.ellipse(x, y, radiusX, radiusY, (random() - 0.5) * 0.22, 0, Math.PI * 2);
    context.fill();
  }

  context.globalAlpha = 0.14;
  context.strokeStyle = "#151d1d";
  context.lineWidth = 3;
  for (const y of [104, 214, 324, 434]) {
    context.beginPath();
    context.moveTo(0, y + (random() - 0.5) * 6);
    context.bezierCurveTo(canvas.width * 0.22, y - 4, canvas.width * 0.48, y + 5, canvas.width, y + (random() - 0.5) * 5);
    context.stroke();
  }

  context.globalAlpha = 0.22;
  for (let index = 0; index < 140; index += 1) {
    const x = random() * canvas.width;
    const y = canvas.height * (0.68 + random() * 0.3);
    const radius = 0.7 + random() * 2.4;
    context.fillStyle = random() > 0.55 ? "#101919" : "#c0b99f";
    context.beginPath();
    context.ellipse(x, y, radius * (0.6 + random() * 1.8), radius * (0.45 + random() * 0.8), random() * Math.PI, 0, Math.PI * 2);
    context.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Applies a broad but restrained weathering layer to the camera-visible west
 * wall of the existing volumetric plant shell. It is deliberately a visual
 * overlay rather than a new facade or shell: the shell remains the closure and
 * depth owner, and all gameplay semantics remain untouched.
 */
export function addPressurePlantCameraFacadeWeathering({
  root,
  record,
}: {
  root: THREE.Group;
  record: PressurePlantSliceDetail;
}) {
  const texture = createFacadeWeatheringTexture();
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    color: 0x525955,
    transparent: true,
    opacity: 0.86,
    blending: THREE.MultiplyBlending,
    premultipliedAlpha: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
    side: THREE.DoubleSide,
  });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(record.size.z - 3.0, record.size.y - 1.0), material);
  wall.name = "pressure_plant_camera_west_facade_weathering_overlay";
  wall.rotation.y = Math.PI / 2;
  wall.position.set(record.position.x - record.size.x / 2 - 0.55, record.position.y + (record.size.y - 1.0) / 2 + 0.5, record.position.z);
  wall.userData.pressurePlantSlice = true;
  wall.userData.pressurePlantDetailId = record.id;
  wall.userData.presentationOnly = true;
  wall.userData.hostId = record.id;
  wall.userData.hostSocket = "image_plant_building_south_service_frame";
  wall.userData.supportClass = "SUPPORTED";
  wall.userData.authoringRecord = {
    type: "pressure-plant-detail",
    ...record,
    role: "camera_visible_facade_weathering_overlay",
    materialFamily: "FACADE_WEATHERING",
    visualHostOffset: { x: -67.5, y: 0.5, z: 0 },
  };
  root.add(wall);
}
