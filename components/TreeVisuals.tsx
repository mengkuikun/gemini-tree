
import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { TreeState, HandData, PhotoData } from '../types';
import { COLORS, SETTINGS } from '../constants';

interface TreeVisualsProps {
  state: TreeState;
  handData: HandData;
  photos: PhotoData[];
}

const TreeVisuals: React.FC<TreeVisualsProps> = ({ state, handData, photos }) => {
  const { scene, gl, camera, size } = useThree();
  const instancedParticlesRef = useRef<THREE.InstancedMesh>(null);
  const instancedShapesRef = useRef<THREE.InstancedMesh>(null);
  const photoGroupRef = useRef<THREE.Group>(null);
  
  // 目标位置计算
  const targets = useMemo(() => {
    const pCount = SETTINGS.PARTICLE_COUNT;
    const sCount = SETTINGS.SHAPE_COUNT;
    
    const collapsed = new Array(pCount + sCount).fill(0).map((_, i) => {
      const h = Math.random() * SETTINGS.TREE_HEIGHT;
      const rScale = Math.pow(1 - (h / SETTINGS.TREE_HEIGHT), 0.8);
      const angle = (h * 5) + (Math.random() * 0.5);
      const radius = Math.random() * SETTINGS.TREE_RADIUS * rScale;
      return new THREE.Vector3(
        Math.cos(angle) * radius,
        h - SETTINGS.TREE_HEIGHT / 2,
        Math.sin(angle) * radius
      );
    });

    const scattered = new Array(pCount + sCount).fill(0).map(() => {
      return new THREE.Vector3(
        (Math.random() - 0.5) * 50,
        (Math.random() - 0.5) * 50,
        (Math.random() - 0.5) * 50
      );
    });

    return { collapsed, scattered };
  }, []);

  // 电影级辉光效果配置
  const composer = useMemo(() => {
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.width, size.height), 
      1.8,  // strength
      0.5,  // radius
      0.8   // threshold
    );
    const comp = new EffectComposer(gl);
    comp.addPass(renderScene);
    comp.addPass(bloomPass);
    return comp;
  }, [gl, scene, camera]);

  // 同步窗口尺寸
  useEffect(() => {
    composer.setSize(size.width, size.height);
  }, [size, composer]);

  const textureLoader = useMemo(() => new THREE.TextureLoader(), []);

  useFrame((stateCtx) => {
    const pMesh = instancedParticlesRef.current;
    const sMesh = instancedShapesRef.current;
    if (!pMesh || !sMesh) return;

    const dummy = new THREE.Object3D();
    const lerpFactor = state === TreeState.COLLAPSED ? 0.08 : 0.03;

    const activeTargets = state === TreeState.COLLAPSED ? targets.collapsed : targets.scattered;

    // 更新粒子
    for (let i = 0; i < SETTINGS.PARTICLE_COUNT; i++) {
      pMesh.getMatrixAt(i, dummy.matrix);
      dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
      const target = activeTargets[i];
      dummy.position.lerp(target, lerpFactor);
      if (state !== TreeState.COLLAPSED) {
        dummy.position.x += Math.sin(stateCtx.clock.elapsedTime * 0.3 + i) * 0.02;
      }
      dummy.updateMatrix();
      pMesh.setMatrixAt(i, dummy.matrix);
    }
    pMesh.instanceMatrix.needsUpdate = true;

    // 更新装饰几何体
    for (let i = 0; i < SETTINGS.SHAPE_COUNT; i++) {
      const idx = SETTINGS.PARTICLE_COUNT + i;
      sMesh.getMatrixAt(i, dummy.matrix);
      dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
      const target = activeTargets[idx];
      dummy.position.lerp(target, lerpFactor);
      dummy.rotation.x += 0.01 + (i * 0.001);
      dummy.rotation.z += 0.005;
      dummy.updateMatrix();
      sMesh.setMatrixAt(i, dummy.matrix);
    }
    sMesh.instanceMatrix.needsUpdate = true;

    // 相机交互
    if (handData.landmarks.length > 0) {
      const targetX = (handData.position.x - 0.5) * 40;
      const targetY = (0.5 - handData.position.y) * 40 + 5;
      camera.position.x += (targetX - camera.position.x) * 0.05;
      camera.position.y += (targetY - camera.position.y) * 0.05;
      camera.lookAt(0, 0, 0);
    } else {
      const speed = 0.3;
      const rot = stateCtx.clock.elapsedTime * speed;
      camera.position.x = Math.sin(rot) * 30;
      camera.position.z = Math.cos(rot) * 30;
      camera.position.y += (5 - camera.position.y) * 0.02;
      camera.lookAt(0, 0, 0);
    }

    // 照片云
    if (photoGroupRef.current) {
      photoGroupRef.current.children.forEach((child, i) => {
        const mesh = child as THREE.Mesh;
        if (state === TreeState.PHOTO_ZOOM && i === 0 && photos.length > 0) {
          const camDir = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion);
          const zoomPos = camera.position.clone().add(camDir.multiplyScalar(-8));
          mesh.position.lerp(zoomPos, 0.1);
          mesh.lookAt(camera.position);
          mesh.scale.lerp(new THREE.Vector3(3, 3, 3), 0.1);
        } else {
          const orbitRadius = 15 + Math.sin(stateCtx.clock.elapsedTime + i) * 5;
          const angle = (stateCtx.clock.elapsedTime * 0.2) + (i * Math.PI * 2 / photos.length);
          const orbitPos = new THREE.Vector3(
            Math.cos(angle) * orbitRadius,
            Math.sin(i * 133) * 10,
            Math.sin(angle) * orbitRadius
          );
          const finalTarget = state === TreeState.COLLAPSED ? orbitPos : activeTargets[i % activeTargets.length];
          mesh.position.lerp(finalTarget, 0.05);
          mesh.scale.lerp(new THREE.Vector3(1, 1, 1), 0.05);
          mesh.lookAt(camera.position);
        }
      });
    }

    // 后期处理渲染逻辑
    composer.render();
  }, 1);

  useEffect(() => {
    const pMesh = instancedParticlesRef.current;
    const sMesh = instancedShapesRef.current;
    if (!pMesh || !sMesh) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < SETTINGS.PARTICLE_COUNT; i++) {
      dummy.scale.setScalar(0.05 + Math.random() * 0.15);
      dummy.updateMatrix();
      pMesh.setMatrixAt(i, dummy.matrix);
      const color = Math.random() > 0.15 ? COLORS.METALLIC_GOLD : COLORS.MATTE_GREEN;
      pMesh.setColorAt(i, new THREE.Color(color));
    }
    for (let i = 0; i < SETTINGS.SHAPE_COUNT; i++) {
      dummy.scale.setScalar(0.3 + Math.random() * 0.5);
      dummy.updateMatrix();
      sMesh.setMatrixAt(i, dummy.matrix);
      const r = Math.random();
      const color = r > 0.6 ? COLORS.CHRISTMAS_RED : (r > 0.3 ? COLORS.METALLIC_GOLD : COLORS.MATTE_GREEN);
      sMesh.setColorAt(i, new THREE.Color(color));
    }
    pMesh.instanceMatrix.needsUpdate = true;
    sMesh.instanceMatrix.needsUpdate = true;
    if (pMesh.instanceColor) pMesh.instanceColor.needsUpdate = true;
    if (sMesh.instanceColor) sMesh.instanceColor.needsUpdate = true;
  }, []);

  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[20, 20, 20]} intensity={3} color={COLORS.METALLIC_GOLD} />
      <pointLight position={[-20, -10, -20]} intensity={1} color={COLORS.MATTE_GREEN} />
      <instancedMesh ref={instancedParticlesRef} args={[undefined, undefined, SETTINGS.PARTICLE_COUNT]}>
        <sphereGeometry args={[0.3, 6, 6]} />
        <meshStandardMaterial emissive={COLORS.METALLIC_GOLD} emissiveIntensity={0.5} metalness={1} roughness={0} />
      </instancedMesh>
      <instancedMesh ref={instancedShapesRef} args={[undefined, undefined, SETTINGS.SHAPE_COUNT]}>
        <boxGeometry args={[0.6, 0.6, 0.6]} />
        <meshStandardMaterial metalness={0.9} roughness={0.1} />
      </instancedMesh>
      <group ref={photoGroupRef}>
        {photos.map((photo, i) => (
          <PhotoMesh key={photo.id} url={photo.url} textureLoader={textureLoader} />
        ))}
      </group>
      <gridHelper args={[120, 40, 0x222222, 0x111111]} position={[0, -15, 0]} />
    </>
  );
};

const PhotoMesh: React.FC<{ url: string, textureLoader: THREE.TextureLoader }> = ({ url, textureLoader }) => {
  const texture = useMemo(() => {
    const tex = textureLoader.load(url);
    tex.anisotropy = 16;
    return tex;
  }, [url, textureLoader]);

  return (
    <mesh>
      <planeGeometry args={[2.5, 2.5]} />
      <meshBasicMaterial map={texture} side={THREE.DoubleSide} transparent opacity={0.95} />
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[2.7, 2.7]} />
        <meshBasicMaterial color={COLORS.METALLIC_GOLD} side={THREE.DoubleSide} />
      </mesh>
    </mesh>
  );
};

export default TreeVisuals;
