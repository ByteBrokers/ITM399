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
  const [facialExpression, setFacialExpression] = useState(initialData?.facial_expression || "happy");
  const [shirtPattern, setShirtPattern] = useState(initialData?.shirt_pattern || "solid");

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

    // Torso (rectangular block) with pattern
    const torsoGeometry = new THREE.BoxGeometry(1.2, 1.8, 0.6);
    
    // Create texture for shirt pattern
    let torsoMaterial;
    if (shirtPattern === "stripes") {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = bodyColor;
      ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 128; i += 16) {
        ctx.fillRect(i, 0, 8, 128);
      }
      const texture = new THREE.CanvasTexture(canvas);
      torsoMaterial = new THREE.MeshLambertMaterial({ map: texture });
    } else if (shirtPattern === "dots") {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = bodyColor;
      ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = '#ffffff';
      for (let x = 16; x < 128; x += 32) {
        for (let y = 16; y < 128; y += 32) {
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      const texture = new THREE.CanvasTexture(canvas);
      torsoMaterial = new THREE.MeshLambertMaterial({ map: texture });
    } else {
      torsoMaterial = new THREE.MeshLambertMaterial({ color: bodyColor });
    }
    
    const torso = new THREE.Mesh(torsoGeometry, torsoMaterial);
    torso.position.y = 1.8;
    torso.userData.type = "torso";
    character.add(torso);

    // Head (cubic block)
    const headGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const headMaterial = new THREE.MeshLambertMaterial({ color: skinColor });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 3.1;
    head.userData.type = "head";
    character.add(head);

    // Eyes - different styles based on expression
    const eyeGeometry = facialExpression === "wink" 
      ? new THREE.BoxGeometry(0.15, 0.05, 0.05)
      : facialExpression === "surprised"
      ? new THREE.BoxGeometry(0.2, 0.2, 0.05)
      : new THREE.BoxGeometry(0.15, 0.15, 0.05);
    const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.2, 3.15, 0.45);
    leftEye.userData.type = "eye";
    character.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    if (facialExpression === "wink") {
      rightEye.scale.y = 3;
      rightEye.position.set(0.2, 3.15, 0.45);
    } else {
      rightEye.position.set(0.2, 3.15, 0.45);
    }
    rightEye.userData.type = "eye";
    character.add(rightEye);

    // Mouth - different shapes based on expression
    let mouthGeometry;
    if (facialExpression === "happy") {
      mouthGeometry = new THREE.BoxGeometry(0.3, 0.08, 0.05);
    } else if (facialExpression === "sad") {
      mouthGeometry = new THREE.BoxGeometry(0.3, 0.08, 0.05);
    } else if (facialExpression === "surprised") {
      mouthGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.05);
    } else if (facialExpression === "angry") {
      mouthGeometry = new THREE.BoxGeometry(0.35, 0.06, 0.05);
    } else {
      mouthGeometry = new THREE.BoxGeometry(0.3, 0.08, 0.05);
    }
    
    const mouthMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
    const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
    
    if (facialExpression === "sad") {
      mouth.position.set(0, 2.8, 0.45);
      mouth.rotation.z = Math.PI;
    } else if (facialExpression === "angry") {
      mouth.position.set(0, 2.82, 0.45);
      mouth.rotation.z = Math.PI * 0.05;
    } else if (facialExpression === "surprised") {
      mouth.position.set(0, 2.82, 0.45);
    } else {
      mouth.position.set(0, 2.85, 0.45);
    }
    mouth.userData.type = "mouth";
    character.add(mouth);

    // Hair (blocky top)
    const hairGeometry = new THREE.BoxGeometry(0.85, 0.3, 0.85);
    const hairMaterial = new THREE.MeshLambertMaterial({ color: 0x2c1810 });
    const hair = new THREE.Mesh(hairGeometry, hairMaterial);
    hair.position.y = 3.55;
    character.add(hair);

    // Left Arm
    const armGeometry = new THREE.BoxGeometry(0.4, 1.6, 0.4);
    const armMaterial = new THREE.MeshLambertMaterial({ color: skinColor });
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.8, 1.8, 0);
    leftArm.userData.type = "arm";
    character.add(leftArm);

    // Right Arm
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.8, 1.8, 0);
    rightArm.userData.type = "arm";
    character.add(rightArm);

    // Left Leg
    const legGeometry = new THREE.BoxGeometry(0.5, 1.4, 0.5);
    const legMaterial = new THREE.MeshLambertMaterial({ color: bodyColor });
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.35, 0.5, 0);
    leftLeg.userData.type = "leg";
    character.add(leftLeg);

    // Right Leg
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.35, 0.5, 0);
    rightLeg.userData.type = "leg";
    character.add(rightLeg);

    return character;
  };

  useEffect(() => {
    if (characterRef.current && sceneRef.current) {
      // Remove old character
      sceneRef.current.remove(characterRef.current);
      // Create new character with updated settings
      const newCharacter = createCharacter();
      sceneRef.current.add(newCharacter);
      characterRef.current = newCharacter;
    }
  }, [bodyColor, skinColor, facialExpression, shirtPattern]);

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
      facial_expression: facialExpression,
      shirt_pattern: shirtPattern,
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

          <div className="space-y-2">
            <Label htmlFor="facialExpression" className="text-sm font-medium text-foreground">
              Facial Expression
            </Label>
            <select
              id="facialExpression"
              value={facialExpression}
              onChange={(e) => setFacialExpression(e.target.value)}
              className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="happy">😊 Happy</option>
              <option value="sad">😢 Sad</option>
              <option value="surprised">😮 Surprised</option>
              <option value="angry">😠 Angry</option>
              <option value="wink">😉 Wink</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="shirtPattern" className="text-sm font-medium text-foreground">
              Shirt Pattern
            </Label>
            <select
              id="shirtPattern"
              value={shirtPattern}
              onChange={(e) => setShirtPattern(e.target.value)}
              className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="solid">Solid Color</option>
              <option value="stripes">Vertical Stripes</option>
              <option value="dots">Polka Dots</option>
            </select>
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
