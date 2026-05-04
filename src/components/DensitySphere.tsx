import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import {
  makeESAG,
  esagDensity,
  makeKentFromESAG,
  kentUnnorm,
  type Vec3,
} from "@/lib/esag";

export type DistKind = "esag" | "iag" | "kent";

interface SphereProps {
  mu: Vec3;
  gamma: [number, number];
  kind: DistKind;
  showAxes: boolean;
  showMean: boolean;
}

// Viridis-ish sequential colormap (perceptually uniform-ish, scientific feel).
function colormap(t: number): [number, number, number] {
  // clamp
  const x = Math.max(0, Math.min(1, t));
  // 5-stop cividis-like ramp
  const stops: [number, [number, number, number]][] = [
    [0.0, [0.0, 0.135, 0.305]],
    [0.25, [0.165, 0.31, 0.43]],
    [0.5, [0.45, 0.46, 0.46]],
    [0.75, [0.78, 0.66, 0.36]],
    [1.0, [1.0, 0.91, 0.31]],
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (x <= t1) {
      const u = (x - t0) / (t1 - t0);
      return [c0[0] + u * (c1[0] - c0[0]), c0[1] + u * (c1[1] - c0[1]), c0[2] + u * (c1[2] - c0[2])];
    }
  }
  return stops[stops.length - 1][1];
}

function DensityMesh({ mu, gamma, kind }: { mu: Vec3; gamma: [number, number]; kind: DistKind }) {
  const geometry = useMemo(() => {
    const geom = new THREE.SphereGeometry(1, 192, 128);
    const pos = geom.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    // Compute densities at each vertex
    const densities = new Float32Array(pos.count);
    let dmax = 0;

    if (kind === "kent") {
      const ctx = makeKentFromESAG(mu, gamma);
      for (let i = 0; i < pos.count; i++) {
        const y: Vec3 = [pos.getX(i), pos.getY(i), pos.getZ(i)];
        const d = kentUnnorm(ctx, y);
        densities[i] = d;
        if (d > dmax) dmax = d;
      }
    } else {
      const ctx = kind === "iag" ? makeESAG(mu, [0, 0]) : makeESAG(mu, gamma);
      for (let i = 0; i < pos.count; i++) {
        const y: Vec3 = [pos.getX(i), pos.getY(i), pos.getZ(i)];
        const d = esagDensity(ctx, y);
        densities[i] = d;
        if (d > dmax) dmax = d;
      }
    }
    if (dmax === 0) dmax = 1;

    // Slight gamma to reveal tail structure
    const inv = 1 / dmax;
    for (let i = 0; i < pos.count; i++) {
      const t = Math.pow(densities[i] * inv, 0.55);
      const [r, g, b] = colormap(t);
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }
    geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geom;
  }, [mu, gamma, kind]);

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial vertexColors />
    </mesh>
  );
}

function MeanMarker({ mu }: { mu: Vec3 }) {
  const a = Math.hypot(mu[0], mu[1], mu[2]);
  const p: [number, number, number] = [mu[0] / a, mu[1] / a, mu[2] / a];
  return (
    <group>
      <mesh position={p}>
        <sphereGeometry args={[0.025, 24, 24]} />
        <meshBasicMaterial color="#dc2626" />
      </mesh>
      <line>
        <bufferGeometry
          attach="geometry"
          onUpdate={(g) => {
            g.setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(...p).multiplyScalar(1.4)]);
          }}
        />
        <lineBasicMaterial attach="material" color="#dc2626" />
      </line>
    </group>
  );
}

function AxesHelper() {
  const ref = useRef<THREE.Group>(null);
  return (
    <group ref={ref}>
      <Axis dir={[1.4, 0, 0]} color="#475569" />
      <Axis dir={[0, 1.4, 0]} color="#475569" />
      <Axis dir={[0, 0, 1.4]} color="#475569" />
    </group>
  );
}

function Axis({ dir, color }: { dir: [number, number, number]; color: string }) {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(...dir)]);
    return g;
  }, [dir]);
  return (
    <line>
      <primitive object={geom} attach="geometry" />
      <lineBasicMaterial attach="material" color={color} transparent opacity={0.4} />
    </line>
  );
}

function AutoSpin({ enabled }: { enabled: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (enabled && ref.current) ref.current.rotation.y += delta * 0.15;
  });
  return <group ref={ref} />;
}

export function DensitySphere({ mu, gamma, kind, showAxes, showMean }: SphereProps) {
  return (
    <Canvas
      camera={{ position: [2.4, 1.6, 2.4], fov: 40 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.9} />
      <DensityMesh mu={mu} gamma={gamma} kind={kind} />
      {showAxes && <AxesHelper />}
      {showMean && <MeanMarker mu={mu} />}
      <OrbitControls enablePan={false} minDistance={1.8} maxDistance={6} />
      <AutoSpin enabled={false} />
    </Canvas>
  );
}