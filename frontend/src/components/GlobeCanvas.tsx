import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store/useStore';
import { globeState } from './BranchLabels';

// Removed HeatmapNode completely as requested

const GlobeMesh: React.FC = () => {
  const globeRef = useRef<THREE.Group>(null);
  const cloudRef = useRef<THREE.Mesh>(null);
  const controlsRef = useRef<any>(null);
  const { camera, size } = useThree();

  const [earthTex, bumpTex, specTex, cloudTex] = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const e = loader.load("/assets/author_earth.jpg");
    e.colorSpace = THREE.SRGBColorSpace;
    
    const b = loader.load("/assets/author_bump.jpg");
    const s = loader.load("/assets/author_spec.jpg");
    
    const c = loader.load("/assets/author_cloud.png");
    c.colorSpace = THREE.SRGBColorSpace;
    
    return [e, b, s, c];
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
      cam.position.setLength(z);
      controlsRef.current.update();
    }
  }, [size, camera]);

  useFrame(() => {
    if (controlsRef.current) {
      globeState.rotationY = controlsRef.current.getAzimuthalAngle();
    }
    if (cloudRef.current) {
      cloudRef.current.rotation.y += 0.001;
    }
  });

  return (
    <>
      <group ref={globeRef}>
        <mesh>
          <sphereGeometry args={[2.5, 64, 64]} />
          <meshPhongMaterial
            map={earthTex}
            bumpMap={bumpTex}
            bumpScale={0.08}
            specularMap={specTex}
            shininess={40}
          />
        </mesh>
        
        {/* Stylized Clouds */}
        <mesh ref={cloudRef} scale={1.033}>
          <sphereGeometry args={[2.5, 64, 64]} />
          <meshBasicMaterial 
            map={cloudTex} 
            transparent 
            opacity={0.8}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
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
        flat
        camera={{ position: [0, 0, 7.5], fov: 42 }}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      >
        <ambientLight intensity={1.2} color="#ffffff" />
        <pointLight position={[-13.3, 3.33, 5.0]} intensity={2.0} decay={0} color="#ffffff" />
        <GlobeMesh />
      </Canvas>
    </div>
  );
};
