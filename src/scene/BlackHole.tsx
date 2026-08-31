import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useStore } from "../state/store";
import { RS_SCENE, sysScaleFor, PHOTON_RS } from "../physics/constants";

/* Event horizon — a perfectly black body. No rim glow: the shadow and
   photon ring are produced by the lensing pass, so the darkness emerges
   naturally from the surrounding emission. A faint warm bloom halo sits
   just outside to blend the disk into the shadow. */

export default function BlackHole() {
  const group = useRef<THREE.Group>(null!);
  const observatory = useStore((s) => s.observatory);

  const horizonGeo = useMemo(() => new THREE.SphereGeometry(RS_SCENE * 1.002, 48, 48), []);
  const horizonMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: new THREE.Color(0x000000), toneMapped: false }),
    []
  );

  // faint inner glow shell (just beyond the horizon, behind the disk)
  const haloGeo = useMemo(() => new THREE.SphereGeometry(RS_SCENE * 1.14, 48, 48), []);
  const haloMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: `
          varying vec3 vN; varying vec3 vW;
          void main(){
            vN = normalize(normalMatrix * normal);
            vec4 w = modelViewMatrix * vec4(position, 1.0);
            vW = w.xyz;
            gl_Position = projectionMatrix * w;
          }`,
        fragmentShader: `
          precision highp float;
          varying vec3 vN; varying vec3 vW;
          uniform float uFade;
          void main(){
            vec3 V = normalize(-vW);
            float rim = pow(1.0 - abs(dot(normalize(vN), V)), 3.0);
            gl_FragColor = vec4(vec3(1.0, 0.55, 0.22) * rim * 0.55 * uFade, rim * uFade);
          }`,
        uniforms: { uFade: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
      }),
    []
  );

  const photonGeo = useMemo(() => {
    const g = new THREE.TorusGeometry(PHOTON_RS * RS_SCENE, 0.018, 8, 128);
    g.rotateX(Math.PI / 2);
    return g;
  }, []);
  const photonMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(0x9fc4ff),
        transparent: true,
        opacity: 0.4,
        toneMapped: false,
      }),
    []
  );

  useFrame((_, delta) => {
    const st = useStore.getState();
    const s = sysScaleFor(st.massSolar);
    group.current.scale.setScalar(s);
    const target = st.disk && st.phase !== "intro" ? 1 : 0;
    haloMat.uniforms.uFade.value +=
      (target - haloMat.uniforms.uFade.value) * Math.min(1, delta * 2);
  });

  return (
    <group ref={group}>
      <mesh geometry={horizonGeo} material={horizonMat} renderOrder={2} />
      <mesh geometry={haloGeo} material={haloMat} renderOrder={1} />
      {observatory && <mesh geometry={photonGeo} material={photonMat} />}
    </group>
  );
}
