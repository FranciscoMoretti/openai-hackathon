import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { SceneState } from './timeline';

// Dimensions approximate the recognizable exterior; construction is an explanatory reconstruction.
export function createBridgeWorld(scene: T.Scene) {
  const stoneClip = new T.Plane(new T.Vector3(0, -1, 0), 100);
  const steelClip = new T.Plane(new T.Vector3(0, -1, 0), 100);
  const mat = (color: number, extra: T.MeshStandardMaterialParameters = {}) => new T.MeshStandardMaterial({ color, roughness: .78, ...extra });
  const masonry = stoneTexture();
  const materials = {
    stone: mat(0xd4c6aa, { map: masonry, clippingPlanes: [stoneClip] }),
    trim: mat(0xe9ddc4, { clippingPlanes: [stoneClip] }),
    roof: mat(0x4b5e65, { metalness: .22, roughness: .55, clippingPlanes: [stoneClip] }),
    dark: mat(0x32464a, { clippingPlanes: [stoneClip] }),
    gold: mat(0xbf954b, { metalness: .55, roughness: .4, clippingPlanes: [stoneClip] }),
    steel: mat(0x617077, { metalness: .5, clippingPlanes: [steelClip] }),
    blue: mat(0x5f9da9, { metalness: .25, roughness: .5 }),
    white: mat(0xe8e5d7), red: mat(0x9b4c40), road: mat(0x6b716c),
    foundation: mat(0xb9b5a2, { map: masonry }),
    bank: mat(0xc8c9b6), brick: mat(0x9b9985), slate: mat(0x7b837c), glass: mat(0x53696b), wood: mat(0x64584a), sail: mat(0xede1c4, { side: T.DoubleSide }),
  };
  type M = keyof typeof materials;
  // Merge static detail by material to keep the model inexpensive on phones.
  function builder(parent: T.Group) {
    const buckets = new Map<M, T.BufferGeometry[]>();
    function add(g: T.BufferGeometry, m: M, x = 0, y = 0, z = 0, rotation = 0) { g.rotateY(rotation); g.translate(x, y, z); const b = buckets.get(m) ?? []; b.push(g); buckets.set(m, b); }
    function box(w: number, h: number, d: number, x: number, y: number, z: number, m: M = 'stone') { add(new T.BoxGeometry(w, h, d), m, x, y, z); }
    function rod(a: number[], b: number[], radius: number, m: M) {
      const from = new T.Vector3(...a), to = new T.Vector3(...b), delta = to.clone().sub(from);
      const g = new T.CylinderGeometry(radius, radius, delta.length(), 6); g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize())); g.translate(...from.add(to).multiplyScalar(.5).toArray()); add(g, m);
    }
    function finish() { for (const [m, geometries] of buckets) { const normalized = geometries.map(g => g.index ? g.toNonIndexed() : g); const g = mergeGeometries(normalized); const mesh = new T.Mesh(g, materials[m]); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); geometries.forEach(g => g.dispose()); normalized.forEach(g => g.dispose()); } }
    return { add, box, rod, finish };
  }
  const bridge = new T.Group(), stone = new T.Group(), steel = new T.Group(), foundations = new T.Group(), spans = new T.Group(), walkways = new T.Group();
  scene.add(bridge); bridge.add(stone, steel, foundations, spans, walkways);
  const b = builder(stone), s = builder(steel), f = builder(foundations), d = builder(spans), w = builder(walkways);
  for (const x of [-39, 39]) {
    // River piers, tapered cutwaters, and stepped plinths.
    f.box(23, 6, 36, x, 3, 0, 'foundation'); f.box(25, 1.2, 38, x, 6.4, 0, 'foundation');
    for (const z of [-18, 18]) f.add(new T.CylinderGeometry(11.5, 11.5, 6, 12), 'foundation', x, 3, z);
    // Road passes through the open ground level, between the two side walls.
    for (const z of [-9.2, 9.2]) b.box(17, 10, 4, x, 12, z);
    b.box(17, 3, 23, x, 18.5, 0); b.box(16, 29, 21, x, 34, 0); b.box(17.4, 2.2, 22.5, x, 49.5, 0, 'trim');
    b.box(15, 4, 19, x, 52.3, 0);
    // Corner shafts, string courses and small Gothic buttresses.
    for (const dx of [-7, 7]) for (const z of [-9.3, 9.3]) {
      b.box(2.6, 36, 2.8, x + dx, 31, z, 'trim');
      b.add(new T.CylinderGeometry(1.7, 1.8, 7, 8), 'stone', x + dx, 54.5, z);
      b.add(new T.ConeGeometry(2.3, 9, 8), 'roof', x + dx, 62, z);
      b.add(new T.CylinderGeometry(.1, .14, 2.4, 6), 'gold', x + dx, 67.4, z);
      b.add(new T.SphereGeometry(.3, 6, 4), 'gold', x + dx, 68.6, z);
      for (const y of [20, 29, 39, 48, 58]) b.box(3, .6, 3.2, x + dx, y, z, 'trim');
    }
    // Steep hipped roof, ridges and finial.
    const roof = new T.ConeGeometry(11.7, 14, 4); roof.rotateY(Math.PI / 4); roof.scale(.86, 1, 1.1); b.add(roof, 'roof', x, 61, 0);
    b.rod([x, 67, 0], [x, 71, 0], .15, 'gold'); b.add(new T.SphereGeometry(.42, 8, 6), 'gold', x, 69.4, 0);
    for (const y of [20, 30, 40, 47, 53]) b.box(17.2, .65, 22.5, x, y, 0, 'trim');
    // Lancet windows and mullions, repeated on both river facades.
    for (const z of [-10.6, 10.6]) for (const y of [24, 34.7, 44]) for (const dx of [-4, 0, 4]) {
      b.box(2.2, 4.6, .16, x + dx, y, z, 'dark');
      const arch = new T.ConeGeometry(1.56, 1.7, 4); arch.rotateY(Math.PI / 4); arch.scale(1, 1, .13); b.add(arch, 'dark', x + dx, y + 2.8, z);
      for (const edge of [-1.3, 1.3]) b.box(.25, 5.5, .4, x + dx + edge, y + .3, z, 'trim');
      b.box(.13, 4.8, .3, x + dx, y, z + Math.sign(z) * .16, 'trim');
      b.box(2.8, .4, .55, x + dx, y - 2.6, z, 'trim');
      b.box(2.1, .13, .3, x + dx, y, z + Math.sign(z) * .16, 'trim');
    }
    for (const dx of [-8.1, 8.1]) for (const y of [25, 36, 45]) for (const z of [-5, 0, 5]) {
      b.box(.18, 4.5, 2.5, x + dx, y, z, 'dark'); b.box(.35, 4.8, .18, x + dx, y, z, 'trim');
    }
    // Projecting dormer gables break the roofline; deep reveals give the facade relief.
    for (const z of [-9.8, 9.8]) {
      b.box(5.8, 7, 1.2, x, 55.5, z, 'trim');
      b.box(3.8, 5.5, 1.35, x, 55.3, z, 'dark');
      b.box(.28, 5.8, 1.6, x, 55.3, z, 'trim');
      b.box(4, .25, 1.6, x, 55.3, z, 'trim');
      const peak = new T.ConeGeometry(4.2, 4.5, 4); peak.rotateY(Math.PI / 4); peak.scale(1, 1, .3); b.add(peak, 'trim', x, 61.3, z);
      for (const dx of [-3, 3]) b.rod([x+dx, 51, z], [x+dx, 61, z], .24, 'trim');
      for (const dx of [-4, 0, 4]) { b.box(1.7, 3.6, .2, x+dx, 13.8, z+Math.sign(z)*1.5, 'dark'); b.box(.15, 3.7, .3, x+dx, 13.8, z+Math.sign(z)*1.7, 'trim'); }
      for (let dx=-6;dx<=6;dx+=1.5) b.box(.55, 1.1, .7, x+dx, 48.2, z+Math.sign(z)*1.4, 'trim');
    }
    // Steel skeleton is revealed before cladding, not an invented castle interior.
    for (const dx of [-6, 6]) for (const z of [-8, 8]) s.box(.75, 48, .75, x + dx, 30, z, 'steel');
    for (let y = 10; y <= 50; y += 8) {
      for (const z of [-8, 8]) { s.box(13, .6, .6, x, y, z, 'steel'); s.rod([x - 6, y, z], [x + 6, y + 8, z], .18, 'steel'); s.rod([x + 6, y, z], [x - 6, y + 8, z], .18, 'steel'); }
      for (const dx of [-6, 6]) { s.box(.6, .6, 17, x + dx, y, 0, 'steel'); s.rod([x + dx, y, -8], [x + dx, y + 8, 8], .18, 'steel'); }
    }
  }
  // Two separate upper walkways, with latticework, glazing and cornice.
  for (const z of [-6.7, 6.7]) {
    w.box(62, 1.1, 3.4, 0, 43.5, z, 'blue'); w.box(62, .65, 3.8, 0, 48.1, z, 'white');
    for (const face of [-1.65, 1.65]) {
      w.box(62, .3, .25, 0, 44, z + face, 'white'); w.box(62,.16,.3,0,44.5,z+face,'red'); w.box(62, .3, .25, 0, 47.5, z + face, 'white');
      for (let x = -30; x < 30; x += 3) { w.rod([x, 44, z + face], [x + 3, 47.5, z + face], .13, 'white'); w.rod([x, 47.5, z + face], [x + 3, 44, z + face], .13, 'white'); }
    }
    w.box(3.2, 3.4, .5, 0, 45.6, z + 1.8, 'blue');
    w.add(new T.SphereGeometry(.65, 8, 6), 'white', 0, 45.7, z + 2.2);
  }
  // Suspension side spans. Curve drops from the towers towards the quays.
  for (const sign of [-1, 1]) {
    d.box(78, 1.5, 15, sign * 85, 12, 0, 'blue'); d.box(78, .25, 10, sign * 85, 12.9, 0, 'road');
    for (const z of [-7.2, 7.2]) {
      d.box(78, .5, .5, sign * 85, 14.7, z, 'white');
      const points: T.Vector3[] = [];
      for (let j = 0; j <= 36; j++) { const t = j / 36; points.push(new T.Vector3(sign * (47 + 77 * t), 15 + 30 * (1 - t) ** 2, z)); }
      d.add(new T.TubeGeometry(new T.CatmullRomCurve3(points), 50, .6, 8, false), 'blue');
      for (let x = 49; x < 123; x += 3.5) { const t = (x - 47) / 77, y = 15 + 30 * (1 - t) ** 2; d.rod([sign * x, 13, z], [sign * x, y, z], .13, 'white'); }
      for (let x = 48; x < 123; x += 2.2) d.box(.12, 1.8, .12, sign * x, 13.9, z, 'white');
      for (let x = 47; x < 122; x += 6) { d.rod([sign * x, 10, z], [sign * (x + 6), 12, z], .16, 'blue'); d.rod([sign * x, 12, z], [sign * (x + 6), 10, z], .16, 'blue'); }
    }
    for (let x = 51; x < 122; x += 9) d.box(4, .03, .15, sign * x, 13.05, 0, 'white');
  }
  const leaves: T.Group[] = [];
  for (const sign of [-1, 1]) {
    const leaf = new T.Group(); leaf.position.set(sign * 30.5, 12, 0); spans.add(leaf); leaves.push(leaf);
    const l = builder(leaf), center = -sign * 15.25;
    l.box(30.5, 1, 15, center, 0, 0, 'blue'); l.box(30.5, .25, 10, center, .65, 0, 'road');
    for (const z of [-7.2, 7.2]) { l.box(30.5, .35, .35, center, 2.3, z, 'white'); l.box(30.5, .3, .35, center, 1.1, z, 'blue'); for (let i = 0; i < 30; i += 2) l.box(.14, 2, .14, -sign * i, 1.3, z, 'white'); }
    for (let x = 0; x < 30; x += 5) { l.box(3, .03, .15, -sign * (x + 2), .8, 0, 'white'); for (const z of [-5, 5]) l.rod([-sign * x, -.3, z], [-sign * (x + 5), -2, z], .2, 'blue'); }
    for (const z of [-5, 5]) l.box(30.5, .5, .5, center, -2, z, 'blue');
    l.finish();
  }
  b.finish(); s.finish(); f.finish(); d.finish(); w.finish();
  // River banks, a deliberately restrained context model rather than a speculative full London.
  const setting = new T.Group(); scene.add(setting); const e = builder(setting);
  for (const sign of [-1, 1]) {
    e.box(66, 7, 280, sign * 153, 2, 0, 'bank'); e.box(4, 8, 280, sign * 122, 2, 0, 'foundation');
    for (let z = -120; z <= 120; z += 9) { e.box(.6, 3, .6, sign * 120, 7, z, 'wood'); e.rod([sign * 120, 8, z], [sign * 120, 8, z + 9], .12, 'wood'); }
    for (let z = -108; z <= 108; z += 28) {
      if (Math.abs(z) < 18) continue;
      const height = 13 + (Math.abs(z) % 3) * 3;
      e.box(23, height, 20, sign * 148, height / 2 + 5, z, 'brick');
      const roof = new T.ConeGeometry(17, 6, 4); roof.rotateY(Math.PI / 4); e.add(roof, 'slate', sign * 148, height + 8, z);
      for (let floor = 9; floor < height + 4; floor += 4) for (let dz = -7; dz <= 7; dz += 5) e.box(.1, 2, 1.5, sign * 136.4, floor, z + dz, 'glass');
    }
  }
  e.finish();
  // Procedural water with low-amplitude moving normals. All motion uses audio time.
  const waterGeo = new T.PlaneGeometry(650, 650, 96, 96); waterGeo.rotateX(-Math.PI / 2);
  const ripples = waterNormals();
  const waterMat = mat(0x81aaa7, { metalness: .35, roughness: .3, normalMap: ripples, normalScale: new T.Vector2(.4,.4) });
  const water = new T.Mesh(waterGeo, waterMat); water.position.y = .2; water.receiveShadow = true; scene.add(water);
  const pos = waterGeo.attributes.position;
  const waterBase = new Float32Array(pos.array);
  const ship = new T.Group(); scene.add(ship); const boat = builder(ship);
  // Faceted wooden hull tapered at bow and stern.
  const outline = [[0,-17],[-3,-13],[-4,-7],[-4,9],[-2.8,13],[0,15],[2.8,13],[4,9],[4,-7],[3,-13]];
  const hull = new T.Shape(); outline.forEach(([x,z],i)=> i ? hull.lineTo(x,z) : hull.moveTo(x,z)); hull.closePath();
  const hullGeo = new T.ExtrudeGeometry(hull, { depth: 3, bevelEnabled: true, bevelThickness: 1, bevelSize: .6, bevelSegments: 2, steps: 1 }); hullGeo.rotateX(Math.PI/2); boat.add(hullGeo,'wood',0,4,0);
  boat.box(5,2,5,0,5,9,'brick');
  for (const [z,h] of [[-5,29],[6,23]]) {
    boat.rod([0,3,z],[0,h,z],.2,'wood');
    for (const y of [h-3,h-11]) {
      boat.rod([-6,y,z],[6,y,z],.13,'wood');
      const sail = new T.PlaneGeometry(11,7,10,8), a=sail.attributes.position;
      for(let i=0;i<a.count;i++){const x=a.getX(i), yy=a.getY(i);a.setZ(i,Math.cos(x/11*Math.PI)*Math.cos(yy/7*Math.PI)*1.5);}
      sail.computeVertexNormals();boat.add(sail,'sail',0,y-3.5,z);
    }
    for(const x of [-3.5,3.5]) for(const end of [-12,12]) boat.rod([0,h-1,z],[x,4,end],.035,'wood');
  }
  boat.rod([0,3,-13],[0,7,-23],.14,'wood'); boat.finish();
  ship.rotation.y = Math.PI; // Bow points in the direction of travel (+z).
  const brown = new T.Color(0x655046), blue = new T.Color(0x4c94b5), cream = new T.Color(0xe8e5d7), oldCream = new T.Color(0x8c7460);
  function update(state: SceneState, still = false) {
    stoneClip.constant = state.stone * 75; steelClip.constant = state.steel * 65;
    stone.visible = state.stone > .001; steel.visible = state.steel > .001 && state.stone < .99;
    foundations.scale.y = Math.max(.001,state.foundations); foundations.visible = state.foundations > .001;
    walkways.visible=state.walkways>.01;walkways.scale.x=Math.max(.001,state.walkways);
    spans.visible = state.deck > .01; spans.scale.y = Math.max(.001,state.deck);
    materials.red.color.copy(brown).lerp(new T.Color(0x9b4c40),state.blue);materials.blue.color.copy(brown).lerp(blue,state.blue); materials.white.color.copy(oldCream).lerp(cream,state.blue);
    // Left and right rotate in opposite directions, around their own river-pier pivots.
    leaves[0].rotation.z = state.lift * 1.18; leaves[1].rotation.z = -state.lift * 1.18;
    ship.position.set(0,0,state.ship*110); ship.visible = state.chapter !== 1 || state.progress < .7;
    const waveTime = still ? 0 : state.time;
    ripples.offset.set(waveTime*.003, waveTime*.0015);
    ship.rotation.z = still ? 0 : Math.sin(waveTime*.7)*.008;
    for (let i=0;i<pos.count;i++){const x=waterBase[i*3],z=waterBase[i*3+2];pos.setY(i,Math.sin(x*.1+waveTime*.7)*Math.cos(z*.11+waveTime*.4)*.22);}
    pos.needsUpdate=true;waterGeo.computeVertexNormals();
  }
  return { update, bridge, ship, leaves, anchors:[new T.Vector3(-90,5,45),new T.Vector3(-39,40,11),new T.Vector3(0,18,8),new T.Vector3(70,30,8)], dispose(){scene.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();}}); Object.values(materials).forEach(m=>m.dispose());waterMat.dispose();masonry.dispose();ripples.dispose();} };
}

function stoneTexture() {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const c=canvas.getContext('2d')!;c.fillStyle='#d8d0bf';c.fillRect(0,0,256,256);
  let seed=41;const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  for(let y=0;y<256;y+=16)for(let x=-32;x<256;x+=64){const left=x+(y%32?32:0),shade=186+Math.floor(random()*35);c.fillStyle=`rgb(${shade+12},${shade+8},${shade})`;c.fillRect(left+1,y+1,62,14);}
  const t=new T.CanvasTexture(canvas);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(2,4);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t;
}

function waterNormals() {
  const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d')!,pixels=ctx.createImageData(256,256);
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){const i=(y*256+x)*4,a=x/256*Math.PI*2,b=y/256*Math.PI*2;pixels.data[i]=128+Math.sin(a*6+b*2)*30+Math.sin(a*11-b*4)*15;pixels.data[i+1]=128+Math.cos(a*2+b*8)*25;pixels.data[i+2]=245;pixels.data[i+3]=255;}
  ctx.putImageData(pixels,0,0);const texture=new T.CanvasTexture(c);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(14,14);return texture;
}
