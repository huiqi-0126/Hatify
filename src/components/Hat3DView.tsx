import React, { useEffect, useMemo, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Float, Center, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface Hat3DViewProps {
    modelUrl: string;
    bodyColor: string;
    brimColor: string;
    sweatbandColor: string;
    stitchingColor: string;
    material: string;
    craft: string;
    text: string;
    font: string;
    includeText: boolean;
}

const getTailwindHex = (color: string) => {
    if (color.startsWith('#')) return color;
    const colorMap: Record<string, string> = {
        'bg-zinc-900': '#18181b',
        'bg-white': '#ffffff',
        'bg-emerald-600': '#059669',
        'bg-slate-800': '#1e293b',
        'bg-rose-600': '#e11d48',
        'bg-stone-400': '#a8a29e',
        'bg-zinc-100': '#f4f4f5',
    };
    const baseClass = color.split(' ')[0];
    return colorMap[baseClass] || '#ffffff';
};

const HatModel = ({ url, bodyColor, brimColor, sweatbandColor, stitchingColor, material }: { url: string; bodyColor: string; brimColor: string; sweatbandColor: string; stitchingColor: string; material: string }) => {
    const { scene: originalScene } = useGLTF(url);
    const scene = useMemo(() => originalScene.clone(), [originalScene]);
    const bodyHex = useMemo(() => getTailwindHex(bodyColor), [bodyColor]);
    const brimHex = useMemo(() => getTailwindHex(brimColor), [brimColor]);
    const sweatbandHex = useMemo(() => getTailwindHex(sweatbandColor), [sweatbandColor]);
    const stitchingHex = useMemo(() => getTailwindHex(stitchingColor), [stitchingColor]);

    const materialProps = useMemo(() => {
        switch (material) {
            case 'suede': return { roughness: 0.9, metalness: 0.05 };
            case 'canvas': return { roughness: 0.8, metalness: 0.1 };
            case 'washed': return { roughness: 0.7, metalness: 0.1 };
            case 'wool': return { roughness: 0.95, metalness: 0.0 };
            case 'polyester': return { roughness: 0.4, metalness: 0.2 };
            case 'mesh': return { roughness: 0.5, metalness: 0.1 };
            default: return { roughness: 0.7, metalness: 0.1 };
        }
    }, [material]);

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
                    
                    const name = mesh.name.toLowerCase();
                    if (name.includes('brim') || name.includes('visor') || name.includes('peak')) {
                        mat.color = new THREE.Color(brimHex);
                    } else if (name.includes('stitch') || name.includes('thread') || name.includes('seam')) {
                        mat.color = new THREE.Color(stitchingHex);
                    } else if (name.includes('sweat') || name.includes('band')) {
                        mat.color = new THREE.Color(sweatbandHex);
                    } else {
                        mat.color = new THREE.Color(bodyHex);
                    }
                    
                    mat.roughness = materialProps.roughness;
                    mat.metalness = materialProps.metalness;
                    mesh.material = mat;
                }
            }
        });
    }, [scene, bodyHex, brimHex, sweatbandHex, stitchingHex, materialProps]);

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
                            <HatModel 
                                url={props.modelUrl} 
                                bodyColor={props.bodyColor} 
                                brimColor={props.brimColor}
                                sweatbandColor={props.sweatbandColor}
                                stitchingColor={props.stitchingColor}
                                material={props.material}
                            />
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
