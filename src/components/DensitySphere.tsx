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

// Plasma colormap (matplotlib), perceptually uniform.
function colormap(t: number): [number, number, number] {
  const x = Math.max(0, Math.min(1, t));
  const stops: [number, [number, number, number]][] = [
    [0.0, [0.050, 0.029, 0.527]],
    [0.125, [0.243, 0.014, 0.611]],
    [0.25, [0.416, 0.000, 0.659]],
    [0.375, [0.578, 0.148, 0.604]],
    [0.5, [0.718, 0.279, 0.503]],
    [0.625, [0.838, 0.413, 0.396]],
    [0.75, [0.937, 0.564, 0.275]],
    [0.875, [0.989, 0.749, 0.157]],
    [1.0, [0.940, 0.975, 0.131]],
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

    // Slight gamma to reveal tail structure, plus iso-density contour bands.
    const inv = 1 / dmax;
    const N_LEVELS = 8;
    for (let i = 0; i < pos.count; i++) {
      const t = Math.pow(densities[i] * inv, 0.55);
      let [r, g, b] = colormap(t);
      // Iso-contour: darken when t is within a thin band around k/N levels.
      const scaled = t * N_LEVELS;
      const frac = Math.abs(scaled - Math.round(scaled)); // 0 at level
      const bandWidth = 0.06;
      if (frac < bandWidth) {
        const k = 1 - frac / bandWidth; // 1 at line center
        const darken = 0.55 * k;
        r *= 1 - darken;
        g *= 1 - darken;
        b *= 1 - darken;
      }
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

// Sphere graticule: parallels (latitude circles) + meridians (longitude circles).
function Graticule() {
  const geom = useMemo(() => {
    const r = 1.002;
    const points: THREE.Vector3[] = [];
    const SEG = 128;
    // Parallels: every 15°
    for (let lat = -75; lat <= 75; lat += 15) {
      const phi = (lat * Math.PI) / 180;
      const y = r * Math.sin(phi);
      const rho = r * Math.cos(phi);
      for (let i = 0; i < SEG; i++) {
        const t0 = (i / SEG) * Math.PI * 2;
        const t1 = ((i + 1) / SEG) * Math.PI * 2;
        points.push(new THREE.Vector3(rho * Math.cos(t0), y, rho * Math.sin(t0)));
        points.push(new THREE.Vector3(rho * Math.cos(t1), y, rho * Math.sin(t1)));
      }
    }
    // Meridians: every 30°
    for (let lon = 0; lon < 360; lon += 30) {
      const lam = (lon * Math.PI) / 180;
      for (let i = 0; i < SEG; i++) {
        const a0 = (i / SEG) * Math.PI - Math.PI / 2;
        const a1 = ((i + 1) / SEG) * Math.PI - Math.PI / 2;
        const p0 = new THREE.Vector3(
          r * Math.cos(a0) * Math.cos(lam),
          r * Math.sin(a0),
          r * Math.cos(a0) * Math.sin(lam),
        );
        const p1 = new THREE.Vector3(
          r * Math.cos(a1) * Math.cos(lam),
          r * Math.sin(a1),
          r * Math.cos(a1) * Math.sin(lam),
        );
        points.push(p0, p1);
      }
    }
    const g = new THREE.BufferGeometry().setFromPoints(points);
    return g;
  }, []);
  return (
    <lineSegments>
      <primitive object={geom} attach="geometry" />
      <lineBasicMaterial attach="material" color="#0f172a" transparent opacity={0.22} />
    </lineSegments>
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
      <Graticule />
      {showAxes && <AxesHelper />}
      {showMean && <MeanMarker mu={mu} />}
      <OrbitControls enablePan={false} minDistance={1.8} maxDistance={6} />
      <AutoSpin enabled={false} />
    </Canvas>
  );
}