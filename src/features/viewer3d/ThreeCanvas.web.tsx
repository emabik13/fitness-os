import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { colors } from '@/theme';

import { presetPosition, roleForMesh } from './muscleHighlight';
import type { CanvasProps } from './types';

const ROLE_COLOR = {
  agonist: colors.muscleAgonist,
  synergist: colors.muscleSynergist,
  stabilizer: colors.muscleStabilizer,
} as const;

interface Ctx {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  mixer: THREE.AnimationMixer | null;
  actions: THREE.AnimationAction[];
  radius: number;
  playing: boolean;
  speed: number;
}

/** WebGL renderer for a GLB model. Loaded lazily; disposes every GPU resource on unmount. */
export default function ThreeCanvas({ uri, roles, preset, playing, speed, restartToken, onLoaded, onError }: CanvasProps) {
  const host = useRef<HTMLDivElement>(null);
  const ctx = useRef<Ctx | null>(null);
  const cb = useRef({ onLoaded, onError });
  useEffect(() => {
    cb.current = { onLoaded, onError };
  }, [onLoaded, onError]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // memory/perf cap on phones
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'none';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 1000);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x222233, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(2, 4, 3);
    scene.add(key);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    const state: Ctx = { camera, controls, mixer: null, actions: [], radius: 1, playing: true, speed: 1 };
    ctx.current = state;

    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    let disposed = false;
    let model: THREE.Object3D | null = null;
    const ownedMaterials: THREE.Material[] = [];
    new GLTFLoader().load(
      uri,
      (gltf) => {
        if (disposed) return;
        model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        state.radius = box.getSize(new THREE.Vector3()).length() / 2 || 1;
        const inactive = new THREE.Color('#5B6270'); // non-involved tissue: neutral, readable on dark UI
        model.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          const role = roleForMesh(mesh.name, roles);
          const mat = new THREE.MeshStandardMaterial({
            color: role ? new THREE.Color(ROLE_COLOR[role]) : inactive,
            roughness: 0.7,
            metalness: 0,
            transparent: !role,
            opacity: role ? 1 : 0.55,
          });
          ownedMaterials.push(mat);
          mesh.material = mat;
        });
        scene.add(model);
        if (gltf.animations.length) {
          state.mixer = new THREE.AnimationMixer(model);
          state.actions = gltf.animations.map((clip) => state.mixer!.clipAction(clip).play());
        }
        const [x, y, z] = presetPosition('front', state.radius);
        camera.position.set(x, y, z);
        controls.minDistance = state.radius * 0.8;
        controls.maxDistance = state.radius * 6;
        controls.update();
        cb.current.onLoaded({ animated: gltf.animations.length > 0 });
      },
      undefined,
      (err) => !disposed && cb.current.onError(`No se pudo cargar el modelo (${err instanceof Error ? err.message : 'error de red'}).`),
    );

    const clock = new THREE.Clock();
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const dt = clock.getDelta();
      if (state.mixer && state.playing) state.mixer.update(dt * state.speed);
      controls.update();
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      state.mixer?.stopAllAction();
      model?.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) mesh.geometry.dispose();
      });
      ownedMaterials.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
      ctx.current = null;
    };
  }, [uri, roles]);

  useEffect(() => {
    const s = ctx.current;
    if (!s) return;
    const [x, y, z] = presetPosition(preset, s.radius);
    s.camera.position.set(x, y, z);
    s.controls.target.set(0, 0, 0);
    s.controls.update();
  }, [preset]);

  useEffect(() => {
    if (ctx.current) ctx.current.playing = playing;
  }, [playing]);
  useEffect(() => {
    if (ctx.current) ctx.current.speed = speed;
  }, [speed]);
  useEffect(() => {
    if (restartToken > 0) ctx.current?.actions.forEach((a) => a.reset().play());
  }, [restartToken]);

  // Web-only file: a plain DOM container hosts the WebGL canvas.
  return <div ref={host} style={{ flex: 1, width: '100%', height: '100%' }} />;
}
