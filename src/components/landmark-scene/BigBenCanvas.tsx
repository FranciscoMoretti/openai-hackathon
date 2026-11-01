import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createBigBen } from './BigBenModel';
import type { StoryScene } from '../../lib/story-scenes';

const views: Record<StoryScene, { position: number[]; target: number[] }> = {
  silhouette: { position: [30, 20, 44], target: [0, 13.4, 0] },
  belfry: { position: [12, 21, 17], target: [0, 19.1, 0] },
  clock: { position: [8, 16.6, 14], target: [0, 14.8, 0] },
  setting: { position: [34, 25, 43], target: [0, 12.5, 0] },
};

type Props = { focus: StoryScene; playing: boolean; paused: boolean; reset: number };
export function BigBenCanvas(props: Props) {
  const container = useRef<HTMLDivElement>(null);
  const latest = useRef(props); latest.current = props;
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
    catch { setFailed(true); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.setClearColor('#ffffff', 0);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
    renderer.domElement.setAttribute('aria-label', 'Interactive illustrative 3D model of Elizabeth Tower');
    renderer.domElement.setAttribute('role', 'img');
    element.append(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 180);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false; controls.enablePan = false; controls.enableZoom = false;
    controls.minPolarAngle = Math.PI / 3; controls.maxPolarAngle = Math.PI / 1.95;
    controls.rotateSpeed = 0.5;
    const model = createBigBen(); scene.add(model);
    scene.add(new THREE.HemisphereLight('#fffaf1', '#d5ded9', 1.8));
    const sun = new THREE.DirectionalLight('#fff0d5', 2.6); sun.position.set(-15, 55, 18);
    sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 34, bottom: -20, near: 1, far: 100 });
    sun.shadow.normalBias = 0.08; scene.add(sun);
    const fill = new THREE.DirectionalLight('#d5e4e9', 1.2); fill.position.set(20, 18, -10); scene.add(fill);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.08 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(5.8, 6, 0.18, 72), new THREE.MeshStandardMaterial({ color: '#edece3', roughness: 1 }));
    plinth.position.y = -0.06; plinth.receiveShadow = true; scene.add(plinth);
    // A restrained architectural base gives scale without inventing geographic detail.
    const rings = new THREE.Mesh(new THREE.RingGeometry(6.7, 6.72, 96), new THREE.MeshBasicMaterial({ color: '#d7dfd7', side: THREE.DoubleSide }));
    rings.rotation.x = -Math.PI / 2; rings.position.y = 0.015; scene.add(rings);
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduced = motion.matches;
    let dirty = true;
    let currentFocus = latest.current.focus;
    let currentReset = latest.current.reset;
    let elapsed = 1.35;
    const fromPosition = new THREE.Vector3(); const fromTarget = new THREE.Vector3();
    const toPosition = new THREE.Vector3(); const toTarget = new THREE.Vector3();
    function setView(immediate: boolean) {
      const view = views[reduced ? 'silhouette' : currentFocus];
      fromPosition.copy(camera.position); fromTarget.copy(controls.target);
      toPosition.fromArray(view.position); toTarget.fromArray(view.target);
      // Fit the full tower on especially narrow canvases without cropping the spire.
      if ((currentFocus === 'silhouette' || currentFocus === 'setting' || reduced) && camera.aspect < 0.65) {
        toPosition.sub(toTarget).multiplyScalar(0.65 / camera.aspect).add(toTarget);
      }
      elapsed = immediate ? 1.35 : 0;
      if (immediate) { camera.position.copy(toPosition); controls.target.copy(toTarget); controls.update(); }
      dirty = true;
    }
    function resize() {
      const { width, height } = element!.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); setView(true);
    }
    const observer = new ResizeObserver(resize); observer.observe(element); resize();
    const onMotion = () => { reduced = motion.matches; setView(true); };
    motion.addEventListener('change', onMotion);
    const onChange = () => { dirty = true; };
    controls.addEventListener('change', onChange);
    const onLost = (event: Event) => { event.preventDefault(); setFailed(true); renderer.setAnimationLoop(null); };
    renderer.domElement.addEventListener('webglcontextlost', onLost);
    let previous = 0;
    renderer.setAnimationLoop((time) => {
      const delta = previous ? Math.min((time - previous) / 1000, 0.05) : 0; previous = time;
      const state = latest.current;
      if (state.focus !== currentFocus || state.reset !== currentReset) {
        const manualReset = state.reset !== currentReset;
        currentFocus = state.focus; currentReset = state.reset; setView(reduced || (manualReset && state.paused));
      }
      controls.enabled = !state.playing && elapsed >= 1.35;
      if (elapsed < 1.35 && !state.paused && !document.hidden) {
        elapsed = Math.min(1.35, elapsed + delta);
        const t = elapsed / 1.35; const eased = t * t * (3 - 2 * t);
        camera.position.lerpVectors(fromPosition, toPosition, eased);
        controls.target.lerpVectors(fromTarget, toTarget, eased);
        controls.update(); dirty = true;
      }
      if (dirty && !document.hidden) { renderer.render(scene, camera); dirty = false; }
    });
    return () => {
      renderer.setAnimationLoop(null); observer.disconnect(); motion.removeEventListener('change', onMotion);
      controls.dispose(); renderer.domElement.removeEventListener('webglcontextlost', onLost);
      const geometries = new Set<THREE.BufferGeometry>(); const materials = new Set<THREE.Material>();
      scene.traverse(object => {
        if (object instanceof THREE.Mesh) { geometries.add(object.geometry); (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material)); }
      });
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => { if ('map' in material && material.map instanceof THREE.Texture) material.map.dispose(); material.dispose(); });
      sun.shadow.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    };
  }, []);
  return <div className="tower-canvas" ref={container} data-scene={props.focus}>
    {failed && <div className="tower-fallback"><img src="/images/big-ben.jpg" alt="Elizabeth Tower and its clock" /><p>3D isn’t available here. You can still listen and explore the story below.</p></div>}
  </div>;
}
