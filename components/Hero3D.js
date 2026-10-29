'use client';
import { useEffect, useRef } from 'react';

// Animated 3D circuit board: chips, copper traces and signal pulses racing between them.
// Uses the locally bundled Three.js (/vendor/three.min.js), so it works offline.
function loadThree() {
  if (window.THREE) return Promise.resolve(window.THREE);
  return new Promise((res, rej) => {
    const ex = document.querySelector('script[data-three]');
    const sc = ex || Object.assign(document.createElement('script'), { src: '/vendor/three.min.js' });
    sc.dataset.three = '1';
    sc.addEventListener('load', () => res(window.THREE)); sc.addEventListener('error', rej);
    if (!ex) document.head.appendChild(sc);
  });
}

export default function Hero3D({ className }) {
  const host = useRef(null);
  useEffect(() => {
    let stop = false, raf = 0, cleanup = () => {};
    loadThree().then(THREE => {
      if (stop || !host.current) return;
      const el = host.current, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
      el.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      scene.fog = new THREE.Fog(0x0a0f15, 14, 34);
      const cam = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
      scene.add(new THREE.AmbientLight(0xffffff, 0.45));
      const key = new THREE.DirectionalLight(0xffffff, 0.9); key.position.set(5, 10, 6); scene.add(key);
      const warm = new THREE.PointLight(0xffd27a, 1.2, 18); warm.position.set(-3, 3, 2); scene.add(warm);

      // board
      const board = new THREE.Mesh(new THREE.BoxGeometry(30, 0.3, 18), new THREE.MeshStandardMaterial({ color: 0x0c2a33, roughness: 0.7, metalness: 0.2 }));
      board.position.y = -0.15; scene.add(board);
      // grid dots
      const dots = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute((() => { const a = []; for (let x = -14; x <= 14; x += 1) for (let z = -8; z <= 8; z += 1) a.push(x, 0.02, z); return a; })(), 3)),
        new THREE.PointsMaterial({ color: 0x1f5463, size: 0.06 }));
      scene.add(dots);

      // chips
      const chipMat = new THREE.MeshStandardMaterial({ color: 0x151a20, roughness: 0.5 });
      const pinMat = new THREE.MeshStandardMaterial({ color: 0xc8cfd6, metalness: 0.8, roughness: 0.3 });
      const chips = [[-6, -2, 3, 2], [0, 1, 4, 3], [6, -3, 2.4, 2.4], [-9, 3, 2, 1.4], [8, 3.5, 2.6, 1.6], [3, -5.5, 2.2, 1.4], [-3, 5.5, 2.4, 1.6]];
      chips.forEach(([x, z, w, d]) => {
        const c = new THREE.Mesh(new THREE.BoxGeometry(w, 0.35, d), chipMat); c.position.set(x, 0.18, z); scene.add(c);
        const n = Math.max(2, Math.round(w * 2));
        for (let k = 0; k < n; k++) for (const side of [-1, 1]) {
          const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.3), pinMat);
          p.position.set(x - w / 2 + (k + 0.5) * w / n, 0.06, z + side * (d / 2 + 0.12)); scene.add(p);
        }
      });
      // capacitors / resistors
      for (let k = 0; k < 14; k++) {
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.6, 16), new THREE.MeshStandardMaterial({ color: k % 3 ? 0x2a6fdb : 0xd9a441, roughness: 0.4 }));
        cap.position.set(-13 + Math.random() * 26, 0.3, -8 + Math.random() * 16); scene.add(cap);
      }

      // traces: Manhattan paths between chips
      const traceMat = new THREE.LineBasicMaterial({ color: 0x3d8f8a, transparent: true, opacity: 0.7 });
      const paths = [];
      const pts = chips.map(([x, z]) => new THREE.Vector3(x, 0.03, z));
      for (let k = 0; k < 22; k++) {
        const a = pts[k % pts.length], b = pts[(k * 3 + 2) % pts.length];
        const mid = Math.random() < 0.5 ? new THREE.Vector3(b.x, 0.03, a.z) : new THREE.Vector3(a.x, 0.03, b.z);
        const off = new THREE.Vector3(0, 0, (Math.random() - 0.5) * 1.2);
        const p = [a.clone().add(off), mid.clone().add(off), b.clone().add(off)];
        scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(p), traceMat));
        paths.push(p);
      }
      // pulses
      const glow = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.3, 'rgba(255,210,122,.8)'); gr.addColorStop(1, 'rgba(255,210,122,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
      const cols = [0xffd27a, 0x46b6ff, 0x5fd38d, 0xff6f5e];
      const pulses = Array.from({ length: 26 }, (_, k) => {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: cols[k % 4], transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
        sp.scale.setScalar(0.7); scene.add(sp);
        return { sp, path: paths[k % paths.length], t: Math.random(), v: 0.12 + Math.random() * 0.2 };
      });
      function at(path, t) { const l1 = path[0].distanceTo(path[1]), l2 = path[1].distanceTo(path[2]), d = t * (l1 + l2); return d < l1 ? path[0].clone().lerp(path[1], d / l1) : path[1].clone().lerp(path[2], (d - l1) / l2); }

      let mx = 0, my = 0;
      const onMove = e => { const r = el.getBoundingClientRect(); mx = (e.clientX - r.left) / r.width - 0.5; my = (e.clientY - r.top) / r.height - 0.5; };
      window.addEventListener('pointermove', onMove);
      const size = () => { const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h, false); cam.aspect = w / Math.max(1, h); cam.updateProjectionMatrix(); };
      const ro = new ResizeObserver(size); ro.observe(el); size();
      let last = performance.now(), T = 0;
      const frame = now => {
        const dt = Math.min(0.05, (now - last) / 1000); last = now; if (!reduce) T += dt;
        const r = cam.aspect < 1 ? 26 : 19;
        cam.position.set(Math.sin(T * 0.05) * 3 + mx * 3, 10.5 - my * 2, r * 0.62 + Math.cos(T * 0.05) * 1.5);
        cam.lookAt(1.5, 0, 0);
        pulses.forEach(p => { if (!reduce) { p.t += p.v * dt; if (p.t > 1) { p.t = 0; p.path = paths[Math.floor(Math.random() * paths.length)]; } } p.sp.position.copy(at(p.path, p.t)).setY(0.12); });
        warm.intensity = 1 + Math.sin(T * 1.3) * 0.25;
        renderer.render(scene, cam);
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
      cleanup = () => { cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener('pointermove', onMove); renderer.dispose(); renderer.domElement.remove(); };
    }).catch(() => {});
    return () => { stop = true; cleanup(); };
  }, []);
  return <div ref={host} className={className} aria-hidden="true" />;
}
