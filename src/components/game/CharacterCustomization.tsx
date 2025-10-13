import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import * as THREE from "three";
import type { CharacterCustomizationData } from "@/types/game";

interface CharacterCustomizationProps {
  onComplete: (data: CharacterCustomizationData) => void;
}

const CharacterCustomization = ({ onComplete }: CharacterCustomizationProps) => {
  const [bodyColor, setBodyColor] = useState("#3498db");
  const [skinColor, setSkinColor] = useState("#ffdbac");
  const [height, setHeight] = useState(1.0);
  const [width, setWidth] = useState(0.8);

  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const characterRef = useRef<THREE.Group | null>(null);
  const animationIdRef = useRef<number>();

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

    const container = containerRef.current;
    const size = Math.min(container.offsetWidth, container.offsetHeight);
    renderer.setSize(size, size);
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    const character = createCharacter();
    scene.add(character);

    camera.position.set(0, 5, 10);
    camera.lookAt(0, 2, 0);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    characterRef.current = character;

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      if (characterRef.current) {
        characterRef.current.rotation.y += 0.01;
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  const createCharacter = () => {
    const character = new THREE.Group();

    const bodyGeometry = new THREE.CylinderGeometry(0.8, 0.8, 3);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: bodyColor });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1.5;
    body.userData.type = "body";
    character.add(body);

    const headGeometry = new THREE.SphereGeometry(0.6);
    const headMaterial = new THREE.MeshLambertMaterial({ color: skinColor });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 3.6;
    head.userData.type = "head";
    character.add(head);

    const eyeGeometry = new THREE.SphereGeometry(0.1);
    const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.2, 3.7, 0.5);
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.2, 3.7, 0.5);
    character.add(leftEye);
    character.add(rightEye);

    return character;
  };

  useEffect(() => {
    if (characterRef.current) {
      characterRef.current.children.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.userData.type === "body") {
            child.material.color.setHex(parseInt(bodyColor.replace("#", "0x")));
          } else if (child.userData.type === "head") {
            child.material.color.setHex(parseInt(skinColor.replace("#", "0x")));
          }
        }
      });
    }
  }, [bodyColor, skinColor]);

  useEffect(() => {
    if (characterRef.current) {
      characterRef.current.scale.set(width, height, width);
    }
  }, [height, width]);

  const handleSubmit = () => {
    onComplete({
      body_color: bodyColor,
      skin_color: skinColor,
      height,
      width,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex">
      <div className="w-80 bg-black/80 backdrop-blur-lg p-6 overflow-y-auto">
        <h2 className="text-2xl font-bold text-white mb-6">🎨 Customize Your Avatar</h2>

        <div className="space-y-6">
          <div>
            <Label htmlFor="bodyColor" className="text-white">
              Body Color:
            </Label>
            <input
              type="color"
              id="bodyColor"
              value={bodyColor}
              onChange={(e) => setBodyColor(e.target.value)}
              className="w-full h-12 rounded-lg cursor-pointer border-none"
            />
          </div>

          <div>
            <Label htmlFor="skinColor" className="text-white">
              Skin Color:
            </Label>
            <input
              type="color"
              id="skinColor"
              value={skinColor}
              onChange={(e) => setSkinColor(e.target.value)}
              className="w-full h-12 rounded-lg cursor-pointer border-none"
            />
          </div>

          <div>
            <Label htmlFor="height" className="text-white">
              Character Height: {height.toFixed(1)}
            </Label>
            <input
              type="range"
              id="height"
              min="0.8"
              max="1.2"
              step="0.1"
              value={height}
              onChange={(e) => setHeight(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <Label htmlFor="width" className="text-white">
              Character Width: {width.toFixed(1)}
            </Label>
            <input
              type="range"
              id="width"
              min="0.6"
              max="1.4"
              step="0.1"
              value={width}
              onChange={(e) => setWidth(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <Button onClick={handleSubmit} className="w-full bg-gradient-primary mt-8">
            Enter Data World! →
          </Button>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 flex items-center justify-center" />
    </div>
  );
};

export default CharacterCustomization;
