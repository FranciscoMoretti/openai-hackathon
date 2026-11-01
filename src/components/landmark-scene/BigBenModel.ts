import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** A deliberately illustrative exterior model, authored for this experience. */
export function createBigBen() {
  const group = new THREE.Group();
  const materials = {
    stone: new THREE.MeshStandardMaterial({ color: '#d8c4a1', roughness: 0.9 }),
    trim: new THREE.MeshStandardMaterial({ color: '#efdfc0', roughness: 0.8 }),
    shade: new THREE.MeshStandardMaterial({ color: '#a69071', roughness: 0.95 }),
    dark: new THREE.MeshStandardMaterial({ color: '#3b4947', roughness: 0.78 }),
    gold: new THREE.MeshStandardMaterial({ color: '#b78b43', roughness: 0.4, metalness: 0.52 }),
    glass: new THREE.MeshStandardMaterial({ color: '#566566', roughness: 0.5 }),
  };
  type Surface = keyof typeof materials;
  const batches = new Map<Surface, THREE.BufferGeometry[]>();
  function part(geometry: THREE.BufferGeometry, material: Surface, x: number, y: number, z: number, ry = 0) {
    geometry.rotateY(ry); geometry.translate(x, y, z);
    const batch = batches.get(material) ?? []; batch.push(geometry); batches.set(material, batch);
  }
  function box(w: number, h: number, d: number, x: number, y: number, z: number, material: Surface = 'stone', ry = 0) {
    part(new THREE.BoxGeometry(w, h, d), material, x, y, z, ry);
  }
  function band(y: number, width: number, height = 0.14, material: Surface = 'trim') { box(width, height, width, 0, y, 0, material); }
  function pyramid(radius: number, height: number, y: number, material: Surface, x = 0, z = 0) {
    part(new THREE.ConeGeometry(radius, height, 4), material, x, y, z, Math.PI / 4);
  }
  function lancet(width: number, height: number) {
    const s = new THREE.Shape();
    s.moveTo(-width / 2, 0); s.lineTo(width / 2, 0); s.lineTo(width / 2, height - width * 0.7);
    s.quadraticCurveTo(width / 2, height - width * 0.25, 0, height);
    s.quadraticCurveTo(-width / 2, height - width * 0.25, -width / 2, height - width * 0.7);
    s.closePath();
    return new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: false });
  }
  function facePart(geometry: THREE.BufferGeometry, surface: Surface, offset: number, y: number, radius: number, face: number) {
    geometry.translate(offset, y, radius); geometry.rotateY(face * Math.PI / 2);
    const batch = batches.get(surface) ?? []; batch.push(geometry); batches.set(surface, batch);
  }

  // Stepped foundation and a tall, vertically ribbed sandstone shaft.
  band(0.14, 5.2, 0.28); band(0.4, 4.8, 0.25, 'shade'); band(0.63, 4.4, 0.2);
  box(3.7, 11.8, 3.7, 0, 6.6, 0);
  for (let y = 1.3; y < 12.6; y += 0.6) band(y, 3.73, 0.025, 'shade');
  for (const x of [-1.9, 1.9]) for (const z of [-1.9, 1.9]) {
    box(0.37, 12.2, 0.37, x, 6.7, z, 'trim');
    box(0.49, 0.3, 0.49, x, 11.95, z, 'trim');
  }
  for (let face = 0; face < 4; face++) {
    for (const x of [-1.24, -0.62, 0, 0.62, 1.24]) {
      facePart(new THREE.BoxGeometry(0.08, 10.7, 0.13), 'trim', x, 6.6, 1.88, face);
    }
    for (const y of [2.0, 5.1, 8.2]) for (const x of [-0.91, -0.3, 0.3, 0.91]) {
      facePart(lancet(0.37, 2.4), 'shade', x, y, 1.86, face);
      facePart(lancet(0.21, 1.85), 'glass', x, y + 0.14, 1.915, face);
    }
  }
  for (const y of [3.0, 6.0, 9.0, 12.0, 12.35, 12.7]) band(y, y > 12 ? 4.25 : 3.96, y > 12 ? 0.16 : 0.09);

  // The clock stage, with four independent decorated clock faces.
  box(4.05, 4.15, 4.05, 0, 14.8, 0, 'stone');
  for (const y of [12.95, 16.6, 16.85]) band(y, 4.5, 0.14);
  const clockTexture = makeClockTexture();
  const clockMaterial = new THREE.MeshStandardMaterial({ map: clockTexture, roughness: 0.63, metalness: 0.05 });
  for (let face = 0; face < 4; face++) {
    const clock = new THREE.Mesh(new THREE.CircleGeometry(1.53, 80), clockMaterial);
    clock.position.set(0, 14.8, 2.058); clock.rotation.y = face * Math.PI / 2;
    clock.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), face * Math.PI / 2); group.add(clock);
    const rim = new THREE.TorusGeometry(1.56, 0.065, 8, 80);
    facePart(rim, 'gold', 0, 14.8, 2.1, face);
    for (const x of [-1.89, 1.89]) facePart(new THREE.BoxGeometry(0.15, 3.9, 0.19), 'trim', x, 14.8, 2.09, face);
    for (const x of [-1.67, 1.67]) for (const y of [13.15, 16.45]) {
      facePart(new THREE.SphereGeometry(0.11, 6, 4), 'gold', x, y, 2.12, face);
    }
  }

  // Belfry remains closed: dark louvres behind fine stone arcades.
  box(3.55, 2.7, 3.55, 0, 18.35, 0, 'dark');
  for (let face = 0; face < 4; face++) {
    for (const x of [-1.56, -1.04, -0.52, 0, 0.52, 1.04, 1.56]) {
      facePart(new THREE.BoxGeometry(0.13, 2.55, 0.24), 'trim', x, 18.35, 1.89, face);
    }
    for (const y of [17.4, 17.65, 17.9, 18.15, 18.4, 18.65, 18.9, 19.15]) {
      facePart(new THREE.BoxGeometry(3.6, 0.055, 0.10), 'shade', 0, y, 1.82, face);
    }
  }
  band(17.1, 4.25); band(19.55, 4.3, 0.22); band(19.82, 4.55, 0.12, 'gold');

  // Gothic pinnacles, slate roof and the gilded finial.
  for (const x of [-1.91, 1.91]) for (const z of [-1.91, 1.91]) {
    box(0.26, 4.9, 0.26, x, 18.2, z, 'trim');
    pyramid(0.31, 0.9, 21.0, 'gold', x, z);
    part(new THREE.SphereGeometry(0.075, 8, 6), 'gold', x, 21.5, z);
  }
  pyramid(2.96, 3.45, 21.42, 'dark');
  for (let i = 0; i < 6; i++) {
    const t = i / 6; const w = 4.18 * (1 - t * 0.76);
    band(19.82 + t * 2.6, w, 0.035, 'gold');
  }
  box(1.27, 1.7, 1.27, 0, 23.0, 0, 'dark');
  band(22.22, 1.65, 0.14, 'gold'); band(23.78, 1.65, 0.14, 'gold');
  for (const x of [-0.65, 0.65]) for (const z of [-0.65, 0.65]) box(0.09, 1.75, 0.09, x, 23, z, 'gold');
  for (let face = 0; face < 4; face++) for (const x of [-0.3, 0, 0.3]) {
    facePart(new THREE.BoxGeometry(0.055, 1.43, 0.05), 'gold', x, 23, 0.66, face);
  }
  pyramid(1.14, 2.65, 25.12, 'dark');
  part(new THREE.CylinderGeometry(0.027, 0.06, 1.15, 8), 'gold', 0, 26.9, 0);
  part(new THREE.SphereGeometry(0.13, 12, 8), 'gold', 0, 26.5, 0);
  box(0.65, 0.055, 0.055, 0, 27.18, 0, 'gold');

  // Merge decorative geometry by material to keep draw calls low on phones.
  for (const [surface, geometries] of batches) {
    const normalized = geometries.map(item => item.index ? item.toNonIndexed() : item);
    const geometry = mergeGeometries(normalized);
    normalized.forEach(item => item.dispose());
    geometries.forEach(item => item.dispose());
    if (!geometry) continue;
    const mesh = new THREE.Mesh(geometry, materials[surface]);
    mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
  }
  return group;
}

function makeClockTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1024;
  const c = canvas.getContext('2d')!;
  c.translate(512, 512);
  c.fillStyle = '#f6edda'; c.beginPath(); c.arc(0, 0, 504, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#b08c45'; c.lineWidth = 19; c.beginPath(); c.arc(0, 0, 486, 0, Math.PI * 2); c.stroke();
  for (const radius of [453, 321, 294, 100]) { c.lineWidth = radius === 453 ? 6 : 3; c.beginPath(); c.arc(0, 0, radius, 0, Math.PI * 2); c.stroke(); }
  c.strokeStyle = '#9d885d'; c.lineWidth = 2;
  for (let i = 0; i < 60; i++) {
    const a = i * Math.PI / 30; const r = i % 5 === 0 ? 425 : 441;
    c.beginPath(); c.moveTo(Math.sin(a) * r, -Math.cos(a) * r); c.lineTo(Math.sin(a) * 454, -Math.cos(a) * 454); c.stroke();
    if (i % 5 === 0) { c.beginPath(); c.moveTo(Math.sin(a) * 104, -Math.cos(a) * 104); c.lineTo(Math.sin(a) * 293, -Math.cos(a) * 293); c.stroke(); }
  }
  const numerals = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  c.fillStyle = '#253937'; c.font = 'bold 77px Georgia'; c.textAlign = 'center'; c.textBaseline = 'middle';
  numerals.forEach((number, i) => { const a = i * Math.PI / 6; c.save(); c.rotate(a); c.fillText(number, 0, -380); c.restore(); });
  function hand(angle: number, length: number, width: number) {
    c.save(); c.rotate(angle); c.fillStyle = '#213b39'; c.beginPath(); c.moveTo(-width / 2, 60); c.lineTo(-width / 2, -length + 60); c.lineTo(0, -length); c.lineTo(width / 2, -length + 60); c.lineTo(width / 2, 60); c.closePath(); c.fill(); c.restore();
  }
  hand(-Math.PI / 3, 258, 22); hand(Math.PI / 3, 345, 14);
  c.fillStyle = '#b08c45'; c.beginPath(); c.arc(0, 0, 23, 0, Math.PI * 2); c.fill();
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
  return texture;
}
