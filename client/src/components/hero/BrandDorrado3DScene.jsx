import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, PerformanceMonitor, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import shapes from './logoShapes.json';
const PARTS = shapes.parts;
const DEPTH = [0.5, 0.4, 0.4, 0.55]; // extrusion depth per part
const EXPLODE = [[0, 0, -0.25], [-0.55, 0, 0.55], [0.55, 0, 0.5], [0, 0.45, 1.1]];
const DPR = [[1, 1], [1, 1.25], [1, 1.75]]; // by quality tier
const SPARKLES = [0, 18, 40];
const DPR_LITE = [[1, 1.25], [1, 1.5]]; // tablet / phone: lower pixel ratio
const TAN = Math.tan(THREE.MathUtils.degToRad(16)); // half of the 32deg camera fov
const SHADOW_RES = [128, 256, 512];
function buildGeometry(p, depth) {
    const shape = new THREE.Shape(p.outer.map(([x, y]) => new THREE.Vector2(x, y)));
    shape.holes = p.holes.map((h) => new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.025, bevelSegments: 3, steps: 1, curveSegments: 1 });
    g.translate(0, 0, -depth / 2);
    g.computeVertexNormals();
    return g;
}
function Monogram({ state, onReady }) {
    const group = useRef(null);
    const meshes = useRef([]);
    const mats = useRef([]);
    const key = useRef(null);
    const rim = useRef(null);
    const sweep = useRef(null);
    const frames = useRef(0);
    const geos = useMemo(() => PARTS.map((p, i) => buildGeometry(p, DEPTH[i] ?? 0.4)), []);
    useEffect(() => () => geos.forEach((g) => g.dispose()), [geos]);
    useFrame((rs, dt) => {
        const s = state;
        const d = Math.min(dt, 0.05);
        // Opening reveal: the object resolves from shadow over ~1.8s.
        if (s.introT < 1) {
            s.introT = Math.min(1, s.introT + d / 1.8);
            s.intro = 1 - Math.pow(1 - s.introT, 3);
            rs.invalidate();
        }
        // Ease the "explore" offsets towards their targets.
        const k = Math.min(1, d * 6);
        if (Math.abs(s.tYaw - s.yaw) > 0.001 || Math.abs(s.tPitch - s.pitch) > 0.001) {
            s.yaw += (s.tYaw - s.yaw) * k;
            s.pitch += (s.tPitch - s.pitch) * k;
            rs.invalidate();
        }
        const t = rs.clock.elapsedTime;
        const drift = s.ambient ? Math.sin(t * 0.35) * 0.07 : 0;
        const cam = rs.camera;
        // Tablet / phone: pull the camera back just far enough that the whole monogram and plinth fit the canvas.
        const camZ = s.lite ? Math.max(3.6 / (2 * TAN), 4.4 / (2 * TAN * cam.aspect)) : s.camZ;
        cam.position.set(0, s.camY, camZ);
        cam.lookAt(0, 0, 0);
        const visibleW = 2 * camZ * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.aspect;
        const g = group.current;
        if (g) {
            g.position.x = s.posX * visibleW;
            g.rotation.set(s.rotX + s.pitch, s.rotY + s.yaw + drift, 0);
            g.scale.setScalar(s.scale * (0.9 + 0.1 * s.intro));
        }
        PARTS.forEach((_, i) => {
            const m = meshes.current[i];
            const e = EXPLODE[i] ?? [0, 0, 0];
            if (m)
                m.position.set(e[0] * s.explode, e[1] * s.explode, e[2] * s.explode);
        });
        const L = s.light * s.intro;
        mats.current.forEach((m) => { if (m)
            m.envMapIntensity = 1.35 * L; });
        if (key.current)
            key.current.intensity = 1.1 * L;
        if (rim.current)
            rim.current.intensity = 1.2 + (1 - Math.min(1, L)) * 1.4; // rim stays on, so the silhouette reads when dim
        if (sweep.current) {
            sweep.current.position.x = s.ambient ? Math.sin(t * 0.4) * 3.2 : 0;
            sweep.current.intensity = 6 * L;
        }
        if (++frames.current === 2)
            onReady();
    });
    return (<>
      <group ref={group}>
        {geos.map((geo, i) => (<mesh key={i} ref={(m) => { meshes.current[i] = m; }} geometry={geo}>
            <meshPhysicalMaterial ref={(m) => { mats.current[i] = m; }} color={PARTS[i].color} metalness={1} roughness={0.24} clearcoat={0.35} clearcoatRoughness={0.2} envMapIntensity={0}/>
          </mesh>))}
      </group>
      <directionalLight ref={key} position={[3, 2.5, 4]}/>
      <directionalLight ref={rim} position={[-3, 3, -4]} color="#ffd9a0"/>
      <pointLight ref={sweep} position={[0, 1.5, 3]} distance={9} color="#ffe2a8"/>
    </>);
}
export default function BrandDorrado3DScene({ state, active, ambient, lowMotion, lite = false, onReady, onFail }) {
    const initial = lowMotion ? 0 : lite ? (window.innerWidth < 640 ? 0 : 1) : ((navigator.hardwareConcurrency ?? 4) >= 8 ? 2 : 1);
    const [tier, setTier] = useState(initial);
    return (<Canvas frameloop={!active ? 'never' : ambient ? 'always' : 'demand'} dpr={lite ? DPR_LITE[Math.min(tier, 1)] : DPR[tier]} camera={{ fov: 32, near: 0.1, far: 60, position: [0, state.camY, state.camZ] }} gl={{ antialias: lite || tier > 0, alpha: true, powerPreference: lite ? 'default' : 'high-performance' }} onCreated={({ gl, invalidate }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.05;
            gl.setClearColor(0x000000, 0);
            state.invalidate = invalidate;
            gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); onFail(); });
        }} style={{ width: '100%', height: '100%' }}>
      <PerformanceMonitor onDecline={() => setTier((t) => Math.max(0, t - 1))}/>
      {/* Dark studio: reflections come from a few soft light panels, no external HDR file is downloaded. */}
      <Environment resolution={tier > 0 ? 256 : 128} frames={1}>
        <color attach="background" args={['#050403']}/>
        <Lightformer form="rect" intensity={5} position={[-4, 3, 3]} scale={[6, 2, 1]} color="#fff2d8"/>
        <Lightformer form="rect" intensity={3} position={[4, 1, -3]} scale={[5, 3, 1]} color="#ffd9a0"/>
        <Lightformer form="rect" intensity={1.2} position={[0, -3, 3]} scale={[8, 1, 1]} color="#c89a3c"/>
        <Lightformer form="ring" intensity={2} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={4} color="#ffffff"/>
      </Environment>
      <Monogram state={state} onReady={onReady}/>
      {/* Restrained plinth + soft contact shadow ground the object. */}
      <mesh position={[0, -1.34, 0]}>
        <cylinderGeometry args={[1.9, 2, 0.1, 64]}/>
        <meshStandardMaterial color="#0c0b0a" roughness={0.45} metalness={0.6}/>
      </mesh>
      <ContactShadows frames={lite ? 1 : Infinity} position={[0, -1.28, 0]} opacity={0.55} scale={9} blur={2.4} far={2.4} resolution={SHADOW_RES[tier]}/>
      {tier > 0 && !lowMotion && !lite && <Sparkles count={SPARKLES[tier]} size={2} speed={0.15} opacity={0.5} scale={[9, 5, 4]} color="#e3b964"/>}
    </Canvas>);
}
