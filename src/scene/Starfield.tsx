import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useStore } from "../state/store";

const VERT = /* glsl */ `
attribute float aSize;
attribute float aPhase;
attribute vec3 aColor;
uniform float uTime;
varying vec3 vC;
varying float vTw;
void main() {
  vC = aColor;
  vTw = 0.7 + 0.3 * sin(uTime * (0.35 + fract(aPhase * 0.13) * 1.3) + aPhase * 41.0);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * (320.0 / max(-mv.z, 1.0));
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
precision highp float;
varying vec3 vC;
varying float vTw;
uniform float uOpacity;
void main() {
  vec2 q = gl_PointCoord - 0.5;
  float d = length(q);
  float a = smoothstep(0.5, 0.06, d) * vTw * uOpacity;
  if (a < 0.003) discard;
  gl_FragColor = vec4(vC, a);
}`;

function makeShell(count: number, rMin: number, rMax: number, sMin: number, sMax: number) {
  const pos = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const phase = new Float32Array(count);
  const color = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = Math.random() * 2 - 1;
    const th = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const r = rMin + Math.pow(Math.random(), 0.8) * (rMax - rMin);
    pos[i * 3] = s * Math.cos(th) * r;
    pos[i * 3 + 1] = u * r * 0.92;
    pos[i * 3 + 2] = s * Math.sin(th) * r;
    size[i] = sMin + Math.pow(Math.random(), 2.4) * (sMax - sMin);
    phase[i] = Math.random() * 100;
    const roll = Math.random();
    const b = 0.55 + Math.random() * 0.45;
    if (roll < 0.12) { color[i*3]=b; color[i*3+1]=b*0.78; color[i*3+2]=b*0.55; }       // warm
    else if (roll < 0.24) { color[i*3]=b*0.62; color[i*3+1]=b*0.76; color[i*3+2]=b; }   // cold blue
    else { color[i*3]=b*0.92; color[i*3+1]=b*0.94; color[i*3+2]=b; }                     // white
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  geo.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
  geo.setAttribute("aColor", new THREE.BufferAttribute(color, 3));
  return geo;
}

export default function Starfield() {
  const density = useStore((s) => s.density);
  const quality = useStore((s) => s.quality);

  const mult = density === "low" ? 0.3 : density === "medium" ? 0.6 : 1;
  const qmult = quality === "performance" ? 0.55 : quality === "balanced" ? 0.8 : 1;

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  const far = useMemo(() => makeShell(Math.floor(15000 * mult * qmult), 420, 900, 0.7, 2.6), [mult, qmult]);
  const near = useMemo(() => makeShell(Math.floor(2200 * mult * qmult), 150, 360, 0.5, 1.4), [mult, qmult]);

  useEffect(() => () => { mat.dispose(); far.dispose(); near.dispose(); }, [mat, far, near]);

  useFrame(({ clock }) => {
    const st = useStore.getState();
    mat.uniforms.uTime.value = clock.elapsedTime;
    mat.uniforms.uOpacity.value = st.starfield ? (st.phase === "intro" ? 0.9 : 1) : 0;
  });

  return (
    <group>
      <points geometry={far} material={mat} frustumCulled={false} />
      <points geometry={near} material={mat} frustumCulled={false} />
    </group>
  );
}
