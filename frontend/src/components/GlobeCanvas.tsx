import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store/useStore';
import { globeState } from './BranchLabels';

const HeatmapNode: React.FC<{
  lat: number;
  lng: number;
  color: string;
  radius: number;
}> = ({ lat, lng, color, radius }) => {
  const { position, rotation } = useMemo(() => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    const x = -radius * Math.sin(phi) * Math.cos(theta);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);

    const pos = new THREE.Vector3(x, y, z);
    const rot = new THREE.Euler().setFromQuaternion(
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        pos.clone().normalize()
      )
    );
    return { position: pos, rotation: rot };
  }, [lat, lng, radius]);

  return (
    <group position={position} rotation={rotation}>
      {/* Core glow */}
      <mesh>
        <circleGeometry args={[0.15, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* Outer heat dispersion */}
      <mesh>
        <circleGeometry args={[0.35, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.25}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

const GlobeMesh: React.FC = () => {
  const globeRef = useRef<THREE.Group>(null);
  const controlsRef = useRef<any>(null);
  const liveTopics = useStore((s) => s.liveTopics);
  const { camera, size } = useThree();

  const earthTexture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const tex = loader.load('/assets/earth_texture.jpg');
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  // Update OrbitControls distance when screen resizes to keep globe visually stable
  React.useEffect(() => {
    const W = size.width;
    const H = size.height;
    const GLOBE_R = Math.min(W, H) * 0.28;
    const targetScreenRadius = GLOBE_R;
    const geometryRadius = 2.5;
    const cam = camera as THREE.PerspectiveCamera;
    const z = (geometryRadius / targetScreenRadius) * (H / (2 * Math.tan((cam.fov / 2) * Math.PI / 180)));
    
    if (controlsRef.current) {
      controlsRef.current.minDistance = z;
      controlsRef.current.maxDistance = z;
      // Force an update to jump to new distance
      cam.position.setLength(z);
      controlsRef.current.update();
    }
  }, [size, camera]);

  useFrame(() => {
    if (controlsRef.current) {
      // Sync azimuthal angle to our custom BranchLabels
      globeState.rotationY = controlsRef.current.getAzimuthalAngle();
    }
  });

  return (
    <>
      <group ref={globeRef}>
        <mesh>
          <sphereGeometry args={[2.5, 64, 64]} />
          <meshPhongMaterial
            map={earthTexture}
            specular={new THREE.Color('#aad4ff')}
            shininess={20}
          />
        </mesh>
        <mesh scale={1.04}>
          <sphereGeometry args={[2.5, 32, 32]} />
          <meshPhongMaterial color="#88ccff" transparent opacity={0.07} />
        </mesh>
        {liveTopics.map((t) => (
          <HeatmapNode key={t.id} lat={t.lat} lng={t.lng} color={t.color} radius={2.52} />
        ))}
      </group>
      <OrbitControls
        ref={controlsRef}
        enableZoom={false}
        enablePan={false}
        rotateSpeed={0.5}
        autoRotate
        autoRotateSpeed={0.4}
        minPolarAngle={Math.PI / 2}
        maxPolarAngle={Math.PI / 2}
        target={[0, 0, 0]}
      />
    </>
  );
};

export const GlobeCanvas: React.FC = () => {
  const viewMode = useStore((s) => s.viewMode);

  return (
    <div
      className="relative w-full h-full"
      style={{
        display: viewMode === 'map' ? 'none' : 'block',
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 7.5], fov: 42 }}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      >
        <ambientLight intensity={0.75} color="#fff4ee" />
        <directionalLight position={[4, 3, 5]} intensity={1.1} color="#ffffff" />
        <GlobeMesh />
      </Canvas>
    </div>
  );
};
