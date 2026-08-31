import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useStore } from "../state/store";
import { live } from "../state/live";
import { RS_SCENE, SHADOW_RS, sysScaleFor } from "../physics/constants";
import { sound } from "../audio/sound";

const FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tSrc;
uniform vec2 uCenter;
uniform float uRadius;
uniform float uAspect;
uniform float uStrength;
uniform float uTime;
uniform float uGrain;
uniform float uVig;

float hash12(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec2 toUV(vec2 s, float asp){ return vec2(s.x / asp, s.y) + 0.5; }

void main(){
  vec2 p = vec2((vUv.x - 0.5) * uAspect, vUv.y - 0.5);
  vec2 c = vec2((uCenter.x - 0.5) * uAspect, uCenter.y - 0.5);
  vec2 dv = p - c;
  float r = length(dv);
  float rs = uRadius;
  vec3 col;

  if (rs < 0.0004 || uStrength < 0.002) {
    col = texture2D(tSrc, vUv).rgb;
  } else {
    vec2 dir = dv / max(r, 1e-5);
    float rr = max(r, rs * 0.3);
    // Einstein-like deflection: image at r shows source at r − k·rs²/r
    float bG = uStrength * rs * rs / rr;
    float bR = uStrength * 1.075 * rs * rs / rr;
    float bB = uStrength * 0.925 * rs * rs / rr;
    // frame-drag-inspired swirl concentrated at the photon ring
    float sw = 0.5 * uStrength * exp(-abs(r - rs * 1.06) / (rs * 0.34));
    float ca = cos(sw); float sa = sin(sw);
    vec2 rd = vec2(dir.x * ca - dir.y * sa, dir.x * sa + dir.y * ca);

    float cr = texture2D(tSrc, toUV(c + rd * (r - bR), uAspect)).r;
    float cg = texture2D(tSrc, toUV(c + rd * (r - bG), uAspect)).g;
    float cb = texture2D(tSrc, toUV(c + rd * (r - bB), uAspect)).b;
    col = vec3(cr, cg, cb);

    // capture shadow
    float edge = rs * 0.97;
    float sh = smoothstep(edge * 0.86, edge * 1.06, r);
    col *= sh;

    // photon ring + secondary ring
    float ring1 = exp(-pow((r - rs * 1.045) / (rs * 0.05), 2.0));
    float ring2 = exp(-pow((r - rs * 1.3) / (rs * 0.13), 2.0));
    col += (vec3(1.0, 0.87, 0.66) * ring1 * 1.35 + vec3(1.0, 0.58, 0.26) * ring2 * 0.4) * uStrength * sh;
    col += vec3(0.035, 0.06, 0.11) * exp(-r / (rs * 2.4)) * uStrength * 0.45;
  }

  vec2 q = vUv - 0.5;
  col *= 1.0 - uVig * dot(q, q) * 1.7;
  float gr = hash12(vUv * vec2(1543.0, 877.0) + fract(uTime * 0.73) * 61.0);
  col += (gr - 0.5) * uGrain;
  col = col / (1.0 + 0.15 * col);
  col = pow(max(col, vec3(0.0)), vec3(0.97));
  gl_FragColor = vec4(col, 1.0);
}`;

const VERT = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

export default function PostFX() {
  const { gl, size, camera, scene } = useThree();
  const quality = useStore((s) => s.quality);
  const lensing = useStore((s) => s.lensing);

  const dpr =
    quality === "cinematic"
      ? Math.min(window.devicePixelRatio, 2)
      : quality === "balanced"
        ? Math.min(window.devicePixelRatio, 1.5)
        : 1;
  const samples = quality === "cinematic" ? 4 : 0;

  const rt = useMemo(
    () =>
      new THREE.WebGLRenderTarget(2, 2, {
        type: THREE.HalfFloatType,
        samples,
      }),
    [samples]
  );

  const post = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        tSrc: { value: null },
        uCenter: { value: new THREE.Vector2(0.5, 0.5) },
        uRadius: { value: 0 },
        uAspect: { value: 1 },
        uStrength: { value: 1 },
        uTime: { value: 0 },
        uGrain: { value: 0.04 },
        uVig: { value: 0.45 },
      },
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    const sc = new THREE.Scene();
    sc.add(mesh);
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    return { geo, mat, sc, cam };
  }, []);

  useEffect(() => {
    rt.setSize(Math.max(2, Math.floor(size.width * dpr)), Math.max(2, Math.floor(size.height * dpr)));
  }, [rt, size, dpr]);

  /* dispose the previous target whenever quality swaps it */
  useEffect(() => () => rt.dispose(), [rt]);

  useEffect(
    () => () => {
      rt.dispose();
      post.geo.dispose();
      post.mat.dispose();
    },
    [rt, post]
  );

  const pv = useMemo(() => new THREE.Vector3(), []);
  const warnRef = useRef(false);

  // This pass owns rendering (priority > 0 disables R3F auto-render).
  useFrame(({ clock }, delta) => {
    const st = useStore.getState();
    const u = post.mat.uniforms;
    u.tSrc.value = rt.texture;
    u.uTime.value = clock.elapsedTime;
    u.uAspect.value = size.width / Math.max(size.height, 1);

    // apparent shadow radius → uv units
    const dist = camera.position.length();
    const shadow = SHADOW_RS * RS_SCENE * sysScaleFor(st.massSolar);
    let radius = 0;
    if (dist > shadow * 1.02) {
      const tanHalfFov = Math.tan(THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov * 0.5));
      const tanA = shadow / Math.sqrt(dist * dist - shadow * shadow);
      radius = tanA / tanHalfFov / 2; // NDC → uv (0..1)
    }
    u.uRadius.value = radius;
    u.uStrength.value = st.lensing ? st.lensingStrength : 0;
    u.uGrain.value = quality === "cinematic" ? 0.042 : quality === "balanced" ? 0.028 : 0;
    u.uVig.value = quality === "performance" ? 0.2 : 0.42;

    pv.set(0, 0, 0).project(camera);
    if (pv.z < 1) u.uCenter.value.set((pv.x + 1) / 2, (pv.y + 1) / 2);

    // sound + warning coupling
    const depth = 1 - Math.min(1, Math.max(live.distRs - 1, 0) / 55);
    sound.update(depth);
    const atHorizon = live.region === "EVENT HORIZON";
    if (atHorizon && !warnRef.current) sound.warn();
    warnRef.current = atHorizon;

    gl.setRenderTarget(rt);
    gl.render(scene, camera);
    gl.setRenderTarget(null);
    gl.render(post.sc, post.cam);
    void lensing;
    void delta;
  }, 1);

  return null;
}
