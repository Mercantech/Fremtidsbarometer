import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store/useStore';
import { globeState } from './BranchLabels';

function ProceduralEarthTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#c8e6f5';
  ctx.fillRect(0, 0, 1024, 512);

  const blobs: [number, number, number, number][] = [
    [260, 140, 190, 105], [475, 125, 130, 85], [490, 225, 105, 135],
    [645, 135, 145, 105], [645, 245, 85, 105], [100, 155, 165, 100],
    [125, 265, 85, 125],  [760, 385, 135, 85],
  ];

  blobs.forEach(([x, y, w, h]) => {
    ctx.fillStyle = '#b8d898'; 
    ctx.beginPath();
    ctx.ellipse(x, y, w / 2, h / 2, 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#a8c880';
    ctx.beginPath();
    ctx.ellipse(x + 8, y - 4, w / 2 - 14, h / 2 - 10, -0.3, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.fillRect(0, 0, 1024, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

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
  const liveTopics = useStore((s) => s.liveTopics);
  const { camera, size } = useThree();

  const earthTexture = useMemo(() => ProceduralEarthTexture(), []);

  // Update camera distance to perfectly match 2D math: GLOBE_R = min(W,H) * 0.28
  useEffect(() => {
    const W = size.width;
    const H = size.height;
    const GLOBE_R = Math.min(W, H) * 0.28;
    const cam = camera as THREE.PerspectiveCamera;
    
    // Formula from original time.html to make the 3D globe exactly GLOBE_R pixels on screen
    // Note: the original geometry sphere radius was GLOBE_R, but we are using 2.5
    // So we need to scale the camera Z proportionally.
    // Original formula: z = GLOBE_R / Math.tan((fov/2)*PI/180) * (H / (2 * SCREEN_R)) (wait, the original used GLOBE_R for geometry radius)
    // If geometry radius is 2.5, then we want it to project to GLOBE_R pixels.
    // The projection formula is: screenRadius = (geometryRadius / z) * (H / (2 * Math.tan(fov/2)))
    // Solving for z:
    const targetScreenRadius = GLOBE_R;
    const geometryRadius = 2.5;
    const z = (geometryRadius / targetScreenRadius) * (H / (2 * Math.tan((cam.fov / 2) * Math.PI / 180)));
    
    cam.position.z = z;
    cam.updateProjectionMatrix();
  }, [size, camera]);

  useFrame((_, delta) => {
    if (globeRef.current) {
      globeRef.current.rotation.y += delta * 0.12;
      globeState.rotationY = globeRef.current.rotation.y;
    }
  });

  return (
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
  );
};

export const GlobeCanvas: React.FC = () => {
  const viewMode = useStore((s) => s.viewMode);

  return (
    <div className={`relative w-full h-full transition-opacity duration-700 ${viewMode === 'map' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      {viewMode === 'globe' && (
        <Canvas
          camera={{ position: [0, 0, 7.5], fov: 42 }}
          style={{ width: '100%', height: '100%', background: 'transparent' }}
        >
          <ambientLight intensity={0.75} color="#fff4ee" />
          <directionalLight position={[4, 3, 5]} intensity={1.1} color="#ffffff" />
          
          <GlobeMesh />
          
          <OrbitControls
            enableZoom={false} // Zoom must be disabled to keep math fixed
            enablePan={false}
            rotateSpeed={0.5}
            autoRotate={false}
          />
        </Canvas>
      )}
    </div>
  );
};
