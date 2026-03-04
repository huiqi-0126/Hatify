import React, { useEffect, useMemo, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Float, Center, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface Hat3DViewProps {
    modelUrl: string;
    bodyColor: string;
    stitchingColor: string;
    text: string;
    font: string;
    includeText: boolean;
}

const getTailwindHex = (twClass: string) => {
    const colorMap: Record<string, string> = {
        'bg-zinc-900': '#18181b',
        'bg-white': '#ffffff',
        'bg-emerald-600': '#059669',
        'bg-slate-800': '#1e293b',
        'bg-rose-600': '#e11d48',
        'bg-stone-400': '#a8a29e',
        'bg-zinc-100': '#f4f4f5',
    };
    // Handle classes with border/other modifiers
    const baseClass = twClass.split(' ')[0];
    return colorMap[baseClass] || '#ffffff';
};

const HatModel = ({ url, bodyColor }: { url: string; bodyColor: string }) => {
    const { scene: originalScene } = useGLTF(url);
    const scene = useMemo(() => originalScene.clone(), [originalScene]);
    const color = useMemo(() => new THREE.Color(getTailwindHex(bodyColor)), [bodyColor]);

    const scale = useMemo(() => {
        const box = new THREE.Box3().setFromObject(scene);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        return 45 / maxDim;
    }, [scene]);

    useEffect(() => {
        scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                if (mesh.material) {
                    const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
                    mat.color = color;
                    mesh.material = mat;
                }
            }
        });
    }, [scene, color]);

    return <primitive object={scene} scale={scale} />;
};

export const Hat3DView = (props: Hat3DViewProps) => {
    return (
        <div className="w-full h-full min-h-[600px] relative">
            <Canvas
                camera={{ position: [0, 0, 80], fov: 40 }}
                gl={{ antialias: true, alpha: true }}
            >
                <Suspense fallback={null}>
                    <Environment preset="studio" />
                    <directionalLight position={[100, 200, 500]} intensity={1.5} />
                    <pointLight position={[-100, -100, 100]} intensity={1} />

                    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
                        <Center>
                            <HatModel url={props.modelUrl} bodyColor={props.bodyColor} />
                        </Center>
                    </Float>
                    <OrbitControls
                        enablePan={false}
                        minDistance={40}
                        maxDistance={200}
                        autoRotate
                        autoRotateSpeed={0.5}
                    />
                    <ContactShadows
                        position={[0, -20, 0]}
                        opacity={0.25}
                        scale={100}
                        blur={2}
                        far={40}
                    />
                </Suspense>
            </Canvas>
        </div>
    );
};
