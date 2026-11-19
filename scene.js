/* Background scene: a glossy ball-and-stick model of a glucose molecule (the six-membered ring:
   five carbons and one oxygen, with its hydroxyl groups) floating in a slow stream of red blood cells.
   Each tab eases the camera to a new angle and shifts the light. No post-processing: crisp on any GPU. */
import * as THREE from "three";
import gsap from "gsap";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const lite = location.search.includes("lite") || matchMedia("(pointer: coarse)").matches;

/* camera angles + light moods, one per tab */
const MOODS = [
  { pos:[0, .5, 8.5],     top:"#060b16", bot:"#132439", rim:"#6fb6ff" },  // basics
  { pos:[-3.4, 1.4, 7.6], top:"#0b0a14", bot:"#2a1620", rim:"#ff8a7a" },  // warning signs
  { pos:[3.2, -1, 7.6],   top:"#060b16", bot:"#16283a", rim:"#e8b04b" },  // test results
  { pos:[0, 3.4, 7.4],    top:"#050a14", bot:"#102238", rim:"#7fb2ff" },  // global facts
  { pos:[4.2, 1, 6.8],    top:"#05100f", bot:"#12302c", rim:"#6fd0b8" },  // risk & prevention
  { pos:[-4, -1, 7.4],    top:"#0a0b12", bot:"#1e2230", rim:"#c9d3e6" }   // sources
];

export function createRealm(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, lite ? 1 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, .1, 200);
  const m0 = MOODS[0];
  camera.position.set(...m0.pos);
  const look = new THREE.Vector3(0, 0, 0);
  scene.fog = new THREE.FogExp2(new THREE.Color(m0.bot), .06);

  /* studio reflections so the model reads as glossy and physical */
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), .04).texture;

  /* ---------- background: a soft vertical gradient ---------- */
  const skyU = { top:{ value:new THREE.Color(m0.top) }, bot:{ value:new THREE.Color(m0.bot) } };
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `uniform vec3 top, bot; varying vec3 vP;
      void main(){ float h = clamp(vP.y*.5+.5, 0., 1.); gl_FragColor = vec4(mix(bot, top, smoothstep(.25, .85, h)), 1.); }`
  })));

  /* ---------- light ---------- */
  scene.add(new THREE.HemisphereLight(0xcfd8ea, 0x101820, .5));
  const key = new THREE.DirectionalLight(0xfff2e2, 2.2); key.position.set(4, 6, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(new THREE.Color(m0.rim), 2.4); rim.position.set(-6, 2, -5); scene.add(rim);

  /* ---------- glucose: ball-and-stick model ---------- */
  const model = new THREE.Group(); model.rotation.set(.5, 0, .15); model.scale.setScalar(.62); scene.add(model);
  const spin = new THREE.Group(); model.add(spin);
  const matC = new THREE.MeshStandardMaterial({ color:0x2b3240, roughness:.22, metalness:.15 });
  const matO = new THREE.MeshStandardMaterial({ color:0xc23b36, roughness:.25, metalness:.05 });
  const matH = new THREE.MeshStandardMaterial({ color:0xe9edf3, roughness:.3, metalness:0 });
  const matB = new THREE.MeshStandardMaterial({ color:0xb9c2cf, roughness:.35, metalness:.3 });
  const up = new THREE.Vector3(0, 1, 0);
  function bond(a, b, r = .06) {
    const d = b.clone().sub(a), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 12), matB);
    m.position.copy(a).add(b).multiplyScalar(.5); m.quaternion.setFromUnitVectors(up, d.normalize()); spin.add(m);
  }
  function atom(p, mat, r) { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), mat); s.position.copy(p); spin.add(s); return p; }
  /* ring with a slight chair pucker; oxygen at index 0 */
  const R = 1.25, ring = [];
  for (let i = 0; i < 6; i++) { const a = i/6*Math.PI*2; ring.push(new THREE.Vector3(Math.cos(a)*R, (i % 2 ? .22 : -.22), Math.sin(a)*R)); }
  ring.forEach((p, i) => atom(p, i === 0 ? matO : matC, i === 0 ? .3 : .32));
  ring.forEach((p, i) => bond(p, ring[(i + 1) % 6]));
  /* hydroxyl groups (O–H) on four carbons, and the CH2OH arm on the fifth */
  [1, 2, 3, 4].forEach(i => { const p = ring[i], out = p.clone().setY(0).normalize(), dir = out.clone().multiplyScalar(.95).add(new THREE.Vector3(0, i % 2 ? .55 : -.55, 0));
    const o = atom(p.clone().add(dir), matO, .24); bond(p, o);
    const h = atom(o.clone().add(out.clone().multiplyScalar(.5)).add(new THREE.Vector3(0, i % 2 ? .25 : -.25, 0)), matH, .14); bond(o, h, .045); });
  { const p = ring[5], out = p.clone().setY(0).normalize(), c6 = atom(p.clone().add(out.clone().multiplyScalar(1.05)).add(new THREE.Vector3(0, .6, 0)), matC, .28); bond(p, c6);
    const o6 = atom(c6.clone().add(new THREE.Vector3(.2, .9, 0)), matO, .24); bond(c6, o6);
    const h6 = atom(o6.clone().add(new THREE.Vector3(.45, .2, 0)), matH, .14); bond(o6, h6, .045); }
  /* ring hydrogens */
  [1, 2, 3, 4, 5].forEach(i => { const p = ring[i], h = atom(p.clone().add(new THREE.Vector3(0, i % 2 ? -.62 : .62, 0)), matH, .13); bond(p, h, .04); });

  /* ---------- red blood cells drifting past ---------- */
  const profile = [];                               // biconcave disc: thin centre, thick rounded rim
  for (let i = 0; i <= 24; i++) { const t = i/24, y = (.08 + .22*Math.pow(Math.sin(t*Math.PI*.5), 6)) * Math.sqrt(Math.max(0, 1 - Math.pow(t, 8))); profile.push(new THREE.Vector2(t*.5, y)); }
  for (let i = 24; i >= 0; i--) { const p = profile[i]; profile.push(new THREE.Vector2(p.x, -p.y)); }
  const cellGeo = new THREE.LatheGeometry(profile, lite ? 24 : 40); cellGeo.computeVertexNormals();
  const cellMat = new THREE.MeshStandardMaterial({ color:0x9e1f2a, roughness:.42, metalness:0, emissive:0x2a0508 });
  const NC = lite ? 12 : 24, cells = [];
  const cellMesh = new THREE.InstancedMesh(cellGeo, cellMat, NC); cellMesh.frustumCulled = false; scene.add(cellMesh);
  for (let i = 0; i < NC; i++) cells.push({ x:(Math.random() - .5)*34, y:(Math.random() - .5)*10, z:-7 - Math.random()*14, s:.8 + Math.random()*.7,
    sp:.25 + Math.random()*.35, rx:Math.random()*6, ry:Math.random()*6, w:(Math.random() - .5)*.6 });
  const o3 = new THREE.Object3D();

  /* ---------- fine particles, very subtle ---------- */
  const NP = lite ? 120 : 300, pp = new Float32Array(NP*3);
  for (let i = 0; i < NP; i++) { pp[i*3] = (Math.random() - .5)*24; pp[i*3+1] = (Math.random() - .5)*12; pp[i*3+2] = -Math.random()*14 + 2; }
  const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.BufferAttribute(pp, 3));
  const dust = new THREE.Points(pg, new THREE.PointsMaterial({ size:.035, color:0xe8d6b0, transparent:true, opacity:.55, depthWrite:false }));
  scene.add(dust);

  /* ---------- sizing ---------- */
  function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false);
    camera.aspect = w/h; camera.fov = w/h < .8 ? 52 : 40;
    if (w/h > 1.25) camera.setViewOffset(w, h, -w*.21, 0, w, h);            /* wide: the model sits right of the text */
    else if (w/h < .8) camera.setViewOffset(w, h, 0, h*.2, w, h);            /* phones: the model sits above the headline */
    else camera.clearViewOffset();
    camera.updateProjectionMatrix(); }
  addEventListener("resize", resize); resize();
  const ptr = { x:0, y:0, tx:0, ty:0 };
  addEventListener("pointermove", e => { if (e.pointerType === "mouse") { ptr.tx = e.clientX/innerWidth - .5; ptr.ty = e.clientY/innerHeight - .5; } }, { passive:true });

  /* ---------- tab -> camera angle + light ---------- */
  const camPos = camera.position.clone();
  function setMood(i) {
    const m = MOODS[i] ?? MOODS[0], d = reduce ? .01 : 1.6;
    gsap.to(camPos, { x:m.pos[0], y:m.pos[1], z:m.pos[2], duration:d, ease:"power3.inOut", overwrite:true });
    const tw = (col, hex) => { const c = new THREE.Color(hex); gsap.to(col, { r:c.r, g:c.g, b:c.b, duration:reduce ? .01 : 1.2, ease:"power2.out", overwrite:true }); };
    tw(skyU.top.value, m.top); tw(skyU.bot.value, m.bot); tw(scene.fog.color, m.bot); tw(rim.color, m.rim);
  }

  /* ---------- loop ---------- */
  const clock = new THREE.Clock(); let running = true, t = 0;
  document.addEventListener("visibilitychange", () => { running = !document.hidden; if (running) { clock.getDelta(); requestAnimationFrame(frame); } });
  const speed = reduce ? .15 : 1;
  function frame() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), .05) * speed; t += dt;
    ptr.x += (ptr.tx - ptr.x)*.05; ptr.y += (ptr.ty - ptr.y)*.05;
    camera.position.set(camPos.x + ptr.x*.8, camPos.y - ptr.y*.5, camPos.z); camera.lookAt(look);
    spin.rotation.y += dt*.22; model.position.y = Math.sin(t*.6)*.08;
    for (let i = 0; i < NC; i++) { const c = cells[i];
      c.x += dt*c.sp; if (c.x > 18) c.x = -18;
      o3.position.set(c.x, c.y + Math.sin(t*.4 + i)*.3, c.z); o3.rotation.set(c.rx + t*.2*c.w, c.ry + t*.15, 0); o3.scale.setScalar(c.s);
      o3.updateMatrix(); cellMesh.setMatrixAt(i, o3.matrix); }
    cellMesh.instanceMatrix.needsUpdate = true;
    dust.rotation.y = t*.01;
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  frame();
  return { setMood };
}
