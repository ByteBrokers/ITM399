import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import * as THREE from "three";
import type { CharacterCustomizationData } from "@/types/game";

interface CharacterCustomizationProps {
  onComplete: (data: CharacterCustomizationData) => void;
  initialData?: CharacterCustomizationData;
}

const CharacterCustomization = ({ onComplete, initialData }: CharacterCustomizationProps) => {
  const [bodyColor, setBodyColor] = useState(initialData?.body_color || "#3498db");
  const [skinColor, setSkinColor] = useState(initialData?.skin_color || "#ffdbac");
  const [height, setHeight] = useState(initialData?.height || 1.0);
  const [width, setWidth] = useState(initialData?.width || 0.8);

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
    <div className="min-h-screen bg-gradient-subtle flex">
      <div className="w-80 bg-card border-r border-border p-6 overflow-y-auto shadow-xl">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">Customize Avatar</h2>
          <p className="text-sm text-muted-foreground">Personalize your character appearance</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="bodyColor" className="text-sm font-medium text-foreground">
              Body Color
            </Label>
            <input
              type="color"
              id="bodyColor"
              value={bodyColor}
              onChange={(e) => setBodyColor(e.target.value)}
              className="w-full h-12 rounded-lg cursor-pointer border border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="skinColor" className="text-sm font-medium text-foreground">
              Skin Color
            </Label>
            <input
              type="color"
              id="skinColor"
              value={skinColor}
              onChange={(e) => setSkinColor(e.target.value)}
              className="w-full h-12 rounded-lg cursor-pointer border border-border"
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label htmlFor="height" className="text-sm font-medium text-foreground">
                Height
              </Label>
              <span className="text-sm font-semibold text-primary">{height.toFixed(1)}x</span>
            </div>
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

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label htmlFor="width" className="text-sm font-medium text-foreground">
                Width
              </Label>
              <span className="text-sm font-semibold text-primary">{width.toFixed(1)}x</span>
            </div>
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

          <Button onClick={handleSubmit} className="w-full mt-8 h-12 text-base font-semibold">
            Enter Game →
          </Button>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 flex items-center justify-center bg-muted/30" />
    </div>
  );
};

export default CharacterCustomization;
