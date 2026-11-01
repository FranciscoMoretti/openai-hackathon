import * as T from 'three';

/** Two complete explanatory models. The audio chooses one; neither model morphs or shrinks. */
export function createMachinery(container: HTMLElement) {
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  container.append(renderer.domElement);
  const scene = new T.Scene();
  const camera = new T.OrthographicCamera(-8.7, 8.7, 6, -6, .1, 100);
  camera.position.set(8, 8, 17); camera.lookAt(0, 2, 0);
  scene.add(new T.HemisphereLight(0xffffff, 0xaaa18a, 2.6));
  const sun = new T.DirectionalLight(0xffe8c4, 3); sun.position.set(-5, 10, 10); scene.add(sun);
  const material = (color: number, metalness = .4) => new T.MeshStandardMaterial({ color, metalness, roughness: .43 });
  const green = material(0x326658), brass = material(0xc5a15d, .65), iron = material(0x384448), blue = material(0x3c819e),
    base = material(0xd7d9cd, .05), red = material(0x9e4031), white = material(0xf5f0db, .1), black = material(0x1d292b);
  const materials = [green, brass, iron, blue, base, red, white, black];
  const mesh = (g: T.BufferGeometry, m: T.Material, parent: T.Object3D, x = 0, y = 0, z = 0) => {
    const o = new T.Mesh(g, m); o.position.set(x, y, z); parent.add(o); return o;
  };
  const box = (w: number, h: number, d: number, m: T.Material, p: T.Object3D, x: number, y: number, z: number) => mesh(new T.BoxGeometry(w, h, d), m, p, x, y, z);
  const cylinder = (radius: number, length: number, m: T.Material, p: T.Object3D, x: number, y: number, z: number, axis: 'x' | 'y' | 'z' = 'y') => {
    const o = mesh(new T.CylinderGeometry(radius, radius, length, 32), m, p, x, y, z);
    if (axis === 'x') o.rotation.z = Math.PI / 2;
    if (axis === 'z') o.rotation.x = Math.PI / 2;
    return o;
  };
  const pipe = (points: number[][], m: T.Material, parent: T.Object3D, radius = .11) => mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p))), 32, radius, 10, false), m, parent);
  const boltRing = (p: T.Object3D, x: number, y: number, z: number, radius: number, n = 8) => {
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; cylinder(.055, .08, brass, p, x + Math.sin(a) * radius, y + Math.cos(a) * radius, z, 'z'); }
  };
  function gauge(p: T.Object3D, x: number, y: number, z: number) {
    cylinder(.27, .12, brass, p, x, y, z, 'z'); cylinder(.22, .13, white, p, x, y, z + .02, 'z');
    const needle = box(.025, .28, .02, red, p, x + .035, y + .035, z + .1); needle.rotation.z = -.6;
    for (let i = 0; i < 7; i++) { const a = i / 6 * Math.PI * 1.4 - .7; box(.025, .045, .02, iron, p, x + Math.sin(a) * .17, y + Math.cos(a) * .17, z + .1); }
  }
  function footing(p: T.Object3D) { box(13.6, .3, 6, base, p, 0, -.15, 0); }
  const steam = new T.Group(), electric = new T.Group(); scene.add(steam, electric); footing(steam); footing(electric);

  // Boiler: riveted shell, fire door, bands, flue and steam delivery pipe.
  cylinder(1.15, 3.1, iron, steam, -4.4, 1.8, -.3, 'z');
  for (const z of [-1.8, -.3, 1.25]) {
    const band = mesh(new T.TorusGeometry(1.16, .065, 8, 40), brass, steam, -4.4, 1.8, z);
    band.rotation.z = Math.PI / 2;
  }
  cylinder(.9, .13, black, steam, -4.4, 1.8, 1.3, 'z'); boltRing(steam, -4.4, 1.8, 1.39, .92, 12);
  cylinder(.53, .16, red, steam, -4.4, 1.65, 1.43, 'z');
  cylinder(.13, .24, brass, steam, -4.4, 1.65, 1.57, 'z');box(.55, .08, .08, iron, steam, -4.4, 1.65, 1.73);
  for (const z of [-1.3, .8]) box(2.5, .5, .45, iron, steam, -4.4, .4, z);
  cylinder(.26, 2.1, black, steam, -4.4, 3.7, -1.1); cylinder(.34, .16, iron, steam, -4.4, 4.75, -1.1);
  gauge(steam, -4.4, 2.6, 1.4);
  pipe([[-3.9, 2.8, 0], [-3.4, 3.3, 0], [-1.4, 3.3, 0], [-1.1, 2.1, 0]], brass, steam);

  // Steam cylinder, piston and red flywheel on a substantial engine bed.
  box(4.8, .5, 2.7, green, steam, -.3, .3, .2);
  cylinder(.65, 2, green, steam, -1.3, 1.5, .2, 'x');
  for (const x of [-2.3, -.3]) cylinder(.74, .15, brass, steam, x, 1.5, .2, 'x');
  box(1.8, .3, 1, iron, steam, 1, 1.05, .2);
  const piston = cylinder(.14, 1.7, brass, steam, .5, 1.5, .2, 'x');
  const flywheel = new T.Group(); flywheel.position.set(1.4, 1.6, 1.1); steam.add(flywheel);
  mesh(new T.TorusGeometry(1.35, .17, 10, 48), red, flywheel);
  mesh(new T.TorusGeometry(1.35, .04, 8, 48), brass, flywheel, 0, 0, .13);
  cylinder(.26, .4, brass, flywheel, 0, 0, 0, 'z');
  for (let i = 0; i < 6; i++) { const spoke = box(.12, 2.55, .14, red, flywheel, 0, 0, 0); spoke.rotation.z = i * Math.PI / 3; }
  cylinder(.12, 1.4, iron, steam, 1.4, 1.6, .4, 'z');
  box(2.2, .45, 1.8, green, steam, 4.3, .3, 0);
  for (const z of [-.45, .45]) {
    cylinder(.34, 1.9, green, steam, 4.3, 1.25, z, 'x'); cylinder(.4, .13, brass, steam, 5.25, 1.25, z, 'x');
    cylinder(.1, 1.2, brass, steam, 2.9, 1.25, z, 'x');
  }
  pipe([[5.2, 1.25, .45], [5.7, 1.25, .45], [5.7, 2.7, -.4], [4.7, 2.7, -.4]], brass, steam);
  gauge(steam, 4.8, 2.6, 0);

  // Modern electric motor: finned casing, fan cover, feet, junction box and coupling.
  box(7.4, .35, 3.5, iron, electric, -1.3, .25, .1);
  cylinder(1.1, 3.3, blue, electric, -2.7, 1.6, .1, 'x');
  for (let i = 0; i < 12; i++) cylinder(1.22, .075, blue, electric, -4.15 + i * .26, 1.6, .1, 'x');
  cylinder(1.14, .3, iron, electric, -4.5, 1.6, .1, 'x');
  for (let i = 0; i < 8; i++) box(.08, .055, 1.6, black, electric, -4.67, 1 + i * .17, .1);
  for (const z of [-.9, .9]) box(3.3, .35, .45, blue, electric, -2.7, .55, z);
  box(1.2, .65, 1, blue, electric, -2.8, 2.85, .1);box(1.32, .1, 1.1, iron, electric, -2.8, 3.2, .1);
  box(.9, .36, .08, brass, electric, -2.8, 1.7, 1.23);
  cylinder(.2, .65, brass, electric, -.7, 1.6, .1, 'x');cylinder(.38, .45, black, electric, -.25, 1.6, .1, 'x');
  // Oil pump and reservoir have separate, easily distinguishable silhouettes.
  box(1.4, 1.4, 1.5, green, electric, .8, 1.6, .1);
  cylinder(.7, .2, brass, electric, 1.6, 1.6, .1, 'x');
  for (const y of [1.1, 2.1]) for (const z of [-.4, .6]) cylinder(.07, .16, brass, electric, 1.75, y, z, 'x');
  box(2.7, 2.6, 2.5, green, electric, 4.5, 1.6, -.3);box(2.9, .18, 2.7, iron, electric, 4.5, 3, -.3);
  cylinder(.23, .35, brass, electric, 4.9, 3.25, -.3);
  box(.25, 1.5, .09, brass, electric, 5.3, 1.8, 1.01);box(.12, 1.3, .1, blue, electric, 5.3, 1.8, 1.07);
  pipe([[1.6, 1.6, .1], [2.2, 1.6, .1], [2.4, 3.35, -.4], [3.3, 3.35, -.4], [3.3, 2.4, -.4]], brass, electric, .13);
  pipe([[3.3, .85, .3], [2.4, .85, 1], [1.3, .85, 1], [1.3, 1.1, .7]], black, electric, .14);
  gauge(electric, 3.9, 2.5, 1.03);
  electric.visible = false;

  const resize = new ResizeObserver(() => {
    const { width, height } = container.getBoundingClientRect(); if (!width || !height) return;
    renderer.setSize(width, height);const aspect=width/height;
    camera.left=-8.1;camera.right=8.1;camera.top=8.1/aspect;camera.bottom=-8.1/aspect;
    camera.updateProjectionMatrix();renderer.render(scene,camera);
  }); resize.observe(container);
  return {
    update(time: number, isElectric: boolean, still: boolean) {
      steam.visible = !isElectric; electric.visible = isElectric;
      // Only the working steam mechanism moves. The switch between complete models is immediate.
      flywheel.rotation.z = still ? 0 : -time * 1.3;
      piston.position.x = .5 + (still ? 0 : Math.sin(time * 1.3) * .2);
      container.dataset.machine = isElectric ? 'electric' : 'steam';
      renderer.render(scene, camera);
    },
    dispose() { resize.disconnect();scene.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});materials.forEach(m=>m.dispose());renderer.dispose(); }
  };
}
