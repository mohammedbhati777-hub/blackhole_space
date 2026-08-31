import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useStore } from "../state/store";
import { live } from "../state/live";
import { RS_SCENE, DISK_INNER_RS, DISK_OUTER_RS, sysScaleFor } from "../physics/constants";

const INNER = DISK_INNER_RS * RS_SCENE; // 6
const OUTER = DISK_OUTER_RS * RS_SCENE; // 16

const NOISE = /* glsl */ `
float hash21(vec2 p){
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}
float vnoise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p){
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 4; i++){ v += a * vnoise(p); p *= 2.13; a *= 0.5; }
  return v;
}`;

const DISK_VERT = /* glsl */ `
varying vec2 vXZ;
void main() {
  vXZ = position.xz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const DISK_FRAG = /* glsl */ `
precision highp float;
varying vec2 vXZ;
uniform float uTime;
uniform float uInner;
uniform float uOuter;
uniform float uViewAngle;
uniform float uDoppler;
uniform float uFade;
${NOISE}
void main() {
  float r = length(vXZ);
  float ang = atan(vXZ.y, vXZ.x);
  float omega = 2.4 * pow(max(r / uInner, 0.3), -1.5); // Kepler: ω ∝ r^-3/2
  float a = ang + uTime * omega;

  float n1 = fbm(vec2(a * 1.6, r * 0.5 - uTime * 0.22));
  float n2 = fbm(vec2(a * 5.5 + 7.0, r * 1.35 + uTime * 0.1));
  float arms = 0.5 + 0.5 * sin(a * 3.0 + r * 1.1 - uTime * omega * 1.7 + n1 * 4.5);

  float dens = (0.5 + 0.5 * arms) * (0.62 + 0.75 * n1) * (0.82 + 0.36 * n2);

  float temp = pow(clamp(uInner / r, 0.0, 1.0), 0.75); // T ∝ r^-3/4 (Shakura–Sunyaev)
  vec3 cHot  = vec3(1.0, 0.97, 0.9);
  vec3 cMid  = vec3(1.0, 0.6, 0.24);
  vec3 cCool = vec3(0.5, 0.14, 0.04);
  vec3 col = mix(cMid, cHot, smoothstep(0.3, 1.0, temp));
  col = mix(cCool, col, smoothstep(0.0, 0.42, temp));

  float dAng = cos(ang - uViewAngle);
  float beta = 0.55 * sqrt(uInner / max(r, uInner));
  float beam = 1.0 + uDoppler * beta * dAng * 1.7;
  col = mix(col, vec3(0.7, 0.38, 0.16), clamp(-dAng * uDoppler * 0.4, 0.0, 1.0));
  col = mix(col, vec3(1.0, 0.99, 0.96), clamp(dAng * uDoppler * 0.32, 0.0, 1.0));

  float alpha = dens * (0.22 + 1.15 * temp) * beam;
  alpha *= smoothstep(uInner, uInner + 1.1, r);
  alpha *= 1.0 - smoothstep(uOuter - 3.4, uOuter, r);
  alpha *= uFade * 0.9;

  gl_FragColor = vec4(col * beam * (0.75 + 0.5 * temp), alpha);
}`;

const PTS_VERT = /* glsl */ `
attribute float aR;
attribute float aA;
attribute float aS;
attribute float aP;
uniform float uTime;
uniform float uInner;
varying float vTemp;
varying float vFlick;
void main() {
  float omega = 2.4 * pow(max(aR / uInner, 0.3), -1.5) * 1.55;
  float ang = aA + uTime * omega;
  float jit = (fract(sin(aP * 12.9898) * 43758.5453) * 2.0 - 1.0);
  float thick = 0.34 * (1.0 - (aR - uInner) / 14.0);
  vec3 p = vec3(cos(ang) * aR, jit * thick, sin(ang) * aR);
  vTemp = pow(clamp(uInner / aR, 0.0, 1.0), 0.75);
  vFlick = 0.6 + 0.4 * sin(uTime * (2.0 + fract(aP) * 3.0) + aP * 17.0);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = min(aS * (150.0 / max(-mv.z, 1.0)), 24.0);
  gl_Position = projectionMatrix * mv;
}`;

const PTS_FRAG = /* glsl */ `
precision highp float;
varying float vTemp;
varying float vFlick;
uniform float uFade;
void main() {
  vec2 q = gl_PointCoord - 0.5;
  float d = length(q);
  float a = smoothstep(0.5, 0.05, d) * vFlick * uFade * (0.25 + 0.9 * vTemp);
  if (a < 0.004) discard;
  vec3 cHot = vec3(1.0, 0.92, 0.78);
  vec3 cCool = vec3(0.85, 0.32, 0.1);
  vec3 col = mix(cCool, cHot, smoothstep(0.1, 0.9, vTemp));
  gl_FragColor = vec4(col, a * 0.85);
}`;

export default function AccretionDisk() {
  const diskOn = useStore((s) => s.disk);
  const density = useStore((s) => s.density);
  const group = useRef<THREE.Group>(null!);

  const diskMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: DISK_VERT,
        fragmentShader: DISK_FRAG,
        uniforms: {
          uTime: { value: 0 },
          uInner: { value: INNER },
          uOuter: { value: OUTER },
          uViewAngle: { value: 0 },
          uDoppler: { value: 1 },
          uFade: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  const ptsCount = density === "low" ? 2600 : density === "medium" ? 7000 : 14000;

  const [ptsGeo, ptsMat] = useMemo(() => {
    const r = new Float32Array(ptsCount);
    const a = new Float32Array(ptsCount);
    const s = new Float32Array(ptsCount);
    const p = new Float32Array(ptsCount);
    const pos = new Float32Array(ptsCount * 3);
    for (let i = 0; i < ptsCount; i++) {
      r[i] = INNER + 10 * Math.pow(Math.random(), 1.35);
      a[i] = Math.random() * Math.PI * 2;
      s[i] = 0.7 + Math.pow(Math.random(), 2) * 2.2;
      p[i] = Math.random() * 100;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aR", new THREE.BufferAttribute(r, 1));
    g.setAttribute("aA", new THREE.BufferAttribute(a, 1));
    g.setAttribute("aS", new THREE.BufferAttribute(s, 1));
    g.setAttribute("aP", new THREE.BufferAttribute(p, 1));
    const m = new THREE.ShaderMaterial({
      vertexShader: PTS_VERT,
      fragmentShader: PTS_FRAG,
      uniforms: { uTime: { value: 0 }, uInner: { value: INNER }, uFade: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return [g, m];
  }, [ptsCount]);

  const ringGeo = useMemo(() => {
    const g = new THREE.RingGeometry(INNER, OUTER, 256, 6);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  useEffect(
    () => () => {
      diskMat.dispose();
      ptsMat.dispose();
      ptsGeo.dispose();
      ringGeo.dispose();
    },
    [diskMat, ptsMat, ptsGeo, ringGeo]
  );

  const fade = useRef(0);

  useFrame(({ camera }, delta) => {
    const st = useStore.getState();
    if (!st.paused) live.diskTime += delta * Math.sqrt(st.massSolar / 10);
    const t = live.diskTime;
    diskMat.uniforms.uTime.value = t;
    ptsMat.uniforms.uTime.value = t;
    diskMat.uniforms.uViewAngle.value = Math.atan2(camera.position.z, camera.position.x);
    const target = st.disk && st.phase !== "intro" ? 1 : st.disk ? 0.001 : 0;
    fade.current += (target - fade.current) * Math.min(1, delta * 2.2);
    diskMat.uniforms.uFade.value = fade.current;
    ptsMat.uniforms.uFade.value = fade.current;

    const s = sysScaleFor(st.massSolar);
    if (group.current) {
      group.current.scale.setScalar(s);
      group.current.visible = fade.current > 0.02;
    }
    void diskOn;
  });

  return (
    <group ref={group}>
      <mesh geometry={ringGeo} material={diskMat} renderOrder={3} />
      <points geometry={ptsGeo} material={ptsMat} frustumCulled={false} renderOrder={4} />
    </group>
  );
}
