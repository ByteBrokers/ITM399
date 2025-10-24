import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { supabase } from "@/integrations/supabase/client";
import logoImage from '@/assets/bytebrokerslogo1.png';
import { toast } from "sonner";
import GameUI from "./GameUI";
import DataPanel from "./DataPanel";
import InteractionPrompt from "./InteractionPrompt";
import CharacterCustomization from "./CharacterCustomization";
import Dashboard from "./Dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import type { CharacterCustomizationData, GameStateData, Company, QuestionnaireData } from "@/types/game";

interface Game3DProps {
  characterData: CharacterCustomizationData;
  initialGameState: GameStateData;
  userId: string;
  onLogout: () => void;
  onGoHome: () => void;
}

const companies: Company[] = [
  {
    name: "TechCorp",
    color: 0x4caf50,
    interests: ["Location Data", "Device Usage", "Digital Habits"],
    multiplier: 1.2,
    description: "We optimize user experiences with location and usage data!",
  },
  {
    name: "AdVentures",
    color: 0xff9800,
    interests: ["Shopping Habits", "Social Media", "Interests"],
    multiplier: 1.5,
    description: "Premium advertising solutions need your shopping and social data!",
  },
  {
    name: "HealthTech",
    color: 0x2196f3,
    interests: ["Health Data", "Fitness Data", "Location Data"],
    multiplier: 1.8,
    description: "Advancing healthcare through data-driven insights!",
  },
  {
    name: "DataMega",
    color: 0x9c27b0,
    interests: ["Digital Habits", "Shopping Habits", "Social Media", "Privacy Preferences"],
    multiplier: 1.1,
    description: "Big data solutions for the modern world!",
  },
];

const Game3D = ({ characterData, initialGameState, userId, onLogout, onGoHome }: Game3DProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState(initialGameState);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [isEditingCharacter, setIsEditingCharacter] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [returnToDashboard, setReturnToDashboard] = useState(false);
  const [currentCharacterData, setCurrentCharacterData] = useState(characterData);
  const [openWithdrawalOnDashboard, setOpenWithdrawalOnDashboard] = useState(false);
  const [showQuestionnaireEditor, setShowQuestionnaireEditor] = useState(false);
  const [questionnaireData, setQuestionnaireData] = useState<QuestionnaireData>({
    name: "",
    age: "",
    location: "",
    occupation: "",
    devices: [],
    social_media: [],
    screen_time: "",
    shopping_freq: "",
    shopping_categories: [],
    fitness: "",
    interests: "",
    privacy_concern: "",
    data_sharing: "",
    email: "",
  });

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const playerRef = useRef<THREE.Group | null>(null);
  const buildingsRef = useRef<THREE.Group[]>([]);
  const npcsRef = useRef<Array<{ mesh: THREE.Group; speed: number; direction: THREE.Vector3; nextTurn: number }>>([]);
  const keysRef = useRef<Record<string, boolean>>({});
  const animationIdRef = useRef<number>();

  useEffect(() => {
    if (!containerRef.current) return;

    initThreeJS();
    animate();
    loadQuestionnaireData();

    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, []);

  // Check cooldown timers and restore owned status
  useEffect(() => {
    const checkCooldowns = async () => {
      const currentTime = Date.now();
      const cooldownPeriod = 60000; // 1 minute in milliseconds
      let hasUpdates = false;
      const updatedDataTypes = { ...gameState.data_types };

      Object.keys(updatedDataTypes).forEach((dataType) => {
        const data = updatedDataTypes[dataType];
        if (!data.owned && data.lastCollectedTime) {
          const timeSinceCollection = currentTime - data.lastCollectedTime;
          if (timeSinceCollection >= cooldownPeriod) {
            updatedDataTypes[dataType] = { ...data, owned: true };
            hasUpdates = true;
          }
        }
      });

      if (hasUpdates) {
        setGameState((prev) => ({ ...prev, data_types: updatedDataTypes }));
        
        // Update database
        if (userId) {
          try {
            await supabase
              .from("game_state")
              .update({ data_types: updatedDataTypes as any })
              .eq("user_id", userId);
            console.log("Cooldowns updated");
          } catch (error) {
            console.error("Error updating cooldowns:", error);
          }
        }
      }
    };

    const interval = setInterval(checkCooldowns, 1000); // Check every second
    return () => clearInterval(interval);
  }, [gameState.data_types, userId]);

  const initThreeJS = () => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x7ec0ee); // Natural sky blue
    scene.fog = new THREE.Fog(0x7ec0ee, 50, 200); // Atmospheric fog
    
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current!.appendChild(renderer.domElement);

    // Natural lighting - warmer sunlight
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xfff4e6, 0.7);
    directionalLight.position.set(50, 80, 50);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Ground - grass village platform
    const groundGeometry = new THREE.PlaneGeometry(150, 150);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x90ee90 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Boundary walls - wooden fence around the village
    const fenceMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    const fenceHeight = 5;
    const fenceThickness = 1;
    
    // North wall
    const northWall = new THREE.Mesh(new THREE.BoxGeometry(150, fenceHeight, fenceThickness), fenceMaterial);
    northWall.position.set(0, fenceHeight / 2, -75);
    scene.add(northWall);
    
    // South wall
    const southWall = new THREE.Mesh(new THREE.BoxGeometry(150, fenceHeight, fenceThickness), fenceMaterial);
    southWall.position.set(0, fenceHeight / 2, 75);
    scene.add(southWall);
    
    // East wall
    const eastWall = new THREE.Mesh(new THREE.BoxGeometry(fenceThickness, fenceHeight, 150), fenceMaterial);
    eastWall.position.set(75, fenceHeight / 2, 0);
    scene.add(eastWall);
    
    // West wall
    const westWall = new THREE.Mesh(new THREE.BoxGeometry(fenceThickness, fenceHeight, 150), fenceMaterial);
    westWall.position.set(-75, fenceHeight / 2, 0);
    scene.add(westWall);
    
    // Add clouds to the sky
    createClouds(scene);

    // ByteBrokers centerpiece
    const createByteBrokerSign = () => {
      const group = new THREE.Group();
      
      // Sign post
      const postGeometry = new THREE.CylinderGeometry(0.2, 0.2, 8);
      const postMaterial = new THREE.MeshLambertMaterial({ color: 0x4a4a4a });
      const post = new THREE.Mesh(postGeometry, postMaterial);
      post.position.y = 4;
      group.add(post);
      
      // Sign board with gradient effect (blue to purple)
      const boardGeometry = new THREE.BoxGeometry(12, 3, 0.3);
      const boardMaterialBlue = new THREE.MeshLambertMaterial({ color: 0x3b82f6 });
      const boardMaterialPurple = new THREE.MeshLambertMaterial({ color: 0x9333ea });
      
      // Create left half (blue)
      const boardLeft = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 0.3), boardMaterialBlue);
      boardLeft.position.set(-3, 8.5, 0);
      group.add(boardLeft);
      
      // Create right half (purple)
      const boardRight = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 0.3), boardMaterialPurple);
      boardRight.position.set(3, 8.5, 0);
      group.add(boardRight);
      
      // Create "ByteBrokers" text using canvas texture
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Create gradient background
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
        gradient.addColorStop(0, '#3b82f6');
        gradient.addColorStop(1, '#9333ea');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 120px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('ByteBrokers', canvas.width / 2, canvas.height / 2);
      }
      
      const texture = new THREE.CanvasTexture(canvas);
      const textMaterial = new THREE.MeshBasicMaterial({ map: texture });
      const textBoard = new THREE.Mesh(boardGeometry, textMaterial);
      textBoard.position.y = 8.5;
      textBoard.position.z = 0.16;
      group.add(textBoard);
      
      group.position.set(0, 0, 0);
      return group;
    };
    
    scene.add(createByteBrokerSign());

    createCityEnvironment(scene);

    const player = createPlayer();
    scene.add(player);

    const buildings = createBuildings(scene);
    buildingsRef.current = buildings;

    camera.position.set(0, 15, 20);
    camera.lookAt(player.position);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    playerRef.current = player;

    window.addEventListener("resize", handleResize);
  };

  const createClouds = (scene: THREE.Scene) => {
    const cloudMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xffffff, 
      transparent: true, 
      opacity: 0.9 
    });

    // Create multiple clouds at different positions - lower and bigger
    const cloudPositions = [
      { x: -40, y: 35, z: -30 },
      { x: 30, y: 30, z: -40 },
      { x: -20, y: 40, z: 40 },
      { x: 50, y: 33, z: 20 },
      { x: 0, y: 45, z: -60 },
      { x: -50, y: 37, z: 30 },
      { x: 40, y: 43, z: -20 },
      { x: -30, y: 31, z: -50 },
      { x: 20, y: 39, z: 50 },
      { x: 60, y: 35, z: -10 },
    ];

    cloudPositions.forEach(pos => {
      const cloud = new THREE.Group();
      
      // Create cloud from multiple spheres for a fluffy look - bigger spheres
      const sphereGeometry = new THREE.SphereGeometry(5, 8, 8);
      
      for (let i = 0; i < 6; i++) {
        const sphere = new THREE.Mesh(sphereGeometry, cloudMaterial);
        const offsetX = (Math.random() - 0.5) * 10;
        const offsetY = (Math.random() - 0.5) * 4;
        const offsetZ = (Math.random() - 0.5) * 8;
        const scale = 0.8 + Math.random() * 0.8;
        
        sphere.position.set(offsetX, offsetY, offsetZ);
        sphere.scale.set(scale, scale * 0.7, scale);
        cloud.add(sphere);
      }
      
      cloud.position.set(pos.x, pos.y, pos.z);
      scene.add(cloud);
    });
  };

  const createCityEnvironment = (scene: THREE.Scene) => {
    // Village paths - dirt paths
    const pathMaterial = new THREE.MeshLambertMaterial({ color: 0xc4a574 });
    
    // Main horizontal path
    const mainPath = new THREE.Mesh(new THREE.PlaneGeometry(140, 8), pathMaterial);
    mainPath.rotation.x = -Math.PI / 2;
    mainPath.position.y = 0.01;
    scene.add(mainPath);

    // Vertical path
    const verticalPath = new THREE.Mesh(new THREE.PlaneGeometry(8, 140), pathMaterial);
    verticalPath.rotation.x = -Math.PI / 2;
    verticalPath.position.y = 0.01;
    scene.add(verticalPath);

    // Add paths to company buildings
    const buildingPaths = [
      { startX: 0, startZ: 0, endX: -30, endZ: -30 },
      { startX: 0, startZ: 0, endX: 30, endZ: -30 },
      { startX: 0, startZ: 0, endX: -30, endZ: 30 },
      { startX: 0, startZ: 0, endX: 30, endZ: 30 }
    ];

    buildingPaths.forEach(path => {
      const deltaX = path.endX - path.startX;
      const deltaZ = path.endZ - path.startZ;
      const length = Math.sqrt(deltaX * deltaX + deltaZ * deltaZ);
      const angle = Math.atan2(deltaZ, deltaX);
      
      const pathMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(length, 4),
        pathMaterial
      );
      pathMesh.rotation.x = -Math.PI / 2;
      pathMesh.rotation.z = -angle;
      pathMesh.position.set(
        (path.startX + path.endX) / 2,
        0.01,
        (path.startZ + path.endZ) / 2
      );
      scene.add(pathMesh);
    });

    // Trees around the village
    const treeTrunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    const treeLeaveMaterial = new THREE.MeshLambertMaterial({ color: 0x228b22 });
    
    const treePositions = [
      { x: -60, z: -60 }, { x: -60, z: 60 }, { x: 60, z: -60 }, { x: 60, z: 60 },
      { x: -50, z: 0 }, { x: 50, z: 0 }, { x: 0, z: -50 }, { x: 0, z: 50 },
      { x: -30, z: -60 }, { x: 30, z: -60 }, { x: -30, z: 60 }, { x: 30, z: 60 }
    ];
    
    treePositions.forEach(pos => {
      // Tree trunk
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 6), treeTrunkMaterial);
      trunk.position.set(pos.x, 3, pos.z);
      scene.add(trunk);
      
      // Tree leaves
      const leaves = new THREE.Mesh(new THREE.SphereGeometry(3), treeLeaveMaterial);
      leaves.position.set(pos.x, 7, pos.z);
      scene.add(leaves);
    });

    // Benches and decorations
    const benchMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    const benchPositions = [
      { x: 20, z: 20 }, { x: -20, z: 20 }, { x: 20, z: -20 }, { x: -20, z: -20 }
    ];
    
    benchPositions.forEach(pos => {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 1.5), benchMaterial);
      bench.position.set(pos.x, 0.5, pos.z);
      scene.add(bench);
      
      const backrest = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 0.3), benchMaterial);
      backrest.position.set(pos.x, 1.5, pos.z - 0.6);
      scene.add(backrest);
    });

    // Add logo to the sky (parallel to user at startup)
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(logoImage, (texture) => {
      const logoMaterial = new THREE.MeshBasicMaterial({ 
        map: texture, 
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide
      });
      const logoGeometry = new THREE.PlaneGeometry(15, 22);
      const logoMesh = new THREE.Mesh(logoGeometry, logoMaterial);
      logoMesh.position.set(0, 35, -60); // Centered in front of user
      logoMesh.rotation.y = 0; // Facing the user
      scene.add(logoMesh);
    });

    // Create animated NPCs (people walking around) - Roblox-style characters
    for (let i = 0; i < 15; i++) {
      const npc = new THREE.Group();
      
      const bodyColors = [0x1e40af, 0x7c3aed, 0x059669, 0xdc2626, 0xf59e0b];
      const skinColors = [0xffdbac, 0xd4a574, 0x8d5524, 0x4a2511, 0xffe0bd];
      const bodyColor = bodyColors[Math.floor(Math.random() * bodyColors.length)];
      const skinColor = skinColors[Math.floor(Math.random() * skinColors.length)];
      
      // Torso (rectangular block)
      const torsoGeometry = new THREE.BoxGeometry(1.2, 1.8, 0.6);
      const torsoMaterial = new THREE.MeshLambertMaterial({ color: bodyColor });
      const torso = new THREE.Mesh(torsoGeometry, torsoMaterial);
      torso.position.y = 1.8;
      npc.add(torso);

      // Head (cubic block)
      const headGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
      const headMaterial = new THREE.MeshLambertMaterial({ color: skinColor });
      const head = new THREE.Mesh(headGeometry, headMaterial);
      head.position.y = 3.1;
      npc.add(head);

      // Eyes
      const eyeGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.05);
      const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
      const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      leftEye.position.set(-0.2, 3.15, 0.45);
      npc.add(leftEye);
      const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      rightEye.position.set(0.2, 3.15, 0.45);
      npc.add(rightEye);

      // Mouth
      const mouthGeometry = new THREE.BoxGeometry(0.3, 0.08, 0.05);
      const mouthMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
      const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
      mouth.position.set(0, 2.85, 0.45);
      npc.add(mouth);

      // Hair (blocky top)
      const hairColors = [0x2c1810, 0xffd700, 0xff6347, 0x000000, 0x8b4513];
      const hairGeometry = new THREE.BoxGeometry(0.85, 0.3, 0.85);
      const hairMaterial = new THREE.MeshLambertMaterial({ 
        color: hairColors[Math.floor(Math.random() * hairColors.length)] 
      });
      const hair = new THREE.Mesh(hairGeometry, hairMaterial);
      hair.position.y = 3.55;
      npc.add(hair);

      // Left Arm
      const armGeometry = new THREE.BoxGeometry(0.4, 1.6, 0.4);
      const armMaterial = new THREE.MeshLambertMaterial({ color: skinColor });
      const leftArm = new THREE.Mesh(armGeometry, armMaterial);
      leftArm.position.set(-0.8, 1.8, 0);
      npc.add(leftArm);

      // Right Arm
      const rightArm = new THREE.Mesh(armGeometry, armMaterial);
      rightArm.position.set(0.8, 1.8, 0);
      npc.add(rightArm);

      // Left Leg
      const legGeometry = new THREE.BoxGeometry(0.5, 1.4, 0.5);
      const legMaterial = new THREE.MeshLambertMaterial({ color: bodyColor });
      const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
      leftLeg.position.set(-0.35, 0.5, 0);
      npc.add(leftLeg);

      // Right Leg
      const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
      rightLeg.position.set(0.35, 0.5, 0);
      npc.add(rightLeg);
      
      // Random starting position
      npc.position.set(
        Math.random() * 60 - 30,
        0,
        Math.random() * 60 - 30
      );
      
      scene.add(npc);
      npcsRef.current.push({
        mesh: npc,
        speed: 0.02 + Math.random() * 0.03,
        direction: new THREE.Vector3(
          Math.random() - 0.5,
          0,
          Math.random() - 0.5
        ).normalize(),
        nextTurn: Math.random() * 300 + 100
      });
    }

    // Street lights at intersections
    const streetLightPositions = [
      { x: -10, z: -10 }, { x: 10, z: -10 },
      { x: -10, z: 10 }, { x: 10, z: 10 }
    ];

    streetLightPositions.forEach(pos => {
      const lamppost = new THREE.Group();

      // Post
      const postGeometry = new THREE.CylinderGeometry(0.15, 0.15, 8);
      const postMaterial = new THREE.MeshLambertMaterial({ color: 0x2c2c2c });
      const post = new THREE.Mesh(postGeometry, postMaterial);
      post.position.y = 4;
      lamppost.add(post);

      // Light fixture
      const lightGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      const lightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const light = new THREE.Mesh(lightGeometry, lightMaterial);
      light.position.y = 8;
      lamppost.add(light);

      // Point light for illumination
      const pointLight = new THREE.PointLight(0xffffff, 1, 20);
      pointLight.position.y = 8;
      lamppost.add(pointLight);

      lamppost.position.set(pos.x, 0, pos.z);
      scene.add(lamppost);
    });
  };

  const createPlayer = (charData: CharacterCustomizationData = currentCharacterData) => {
    const player = new THREE.Group();

    const bodyColor = parseInt(charData.body_color.replace("#", "0x"));
    const skinColor = parseInt(charData.skin_color.replace("#", "0x"));
    const facialExpression = charData.facial_expression || "happy";
    const shirtPattern = charData.shirt_pattern || "solid";

    // Torso (rectangular block) with pattern
    const torsoGeometry = new THREE.BoxGeometry(
      1.2 * charData.width,
      1.8 * charData.height,
      0.6 * charData.width
    );
    
    // Create texture for shirt pattern
    let torsoMaterial;
    if (shirtPattern === "stripes") {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = charData.body_color;
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
      ctx.fillStyle = charData.body_color;
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
    torso.position.y = 1.8 * charData.height;
    player.add(torso);

    // Head (cubic block)
    const headGeometry = new THREE.BoxGeometry(
      0.8 * charData.height,
      0.8 * charData.height,
      0.8 * charData.height
    );
    const headMaterial = new THREE.MeshLambertMaterial({ color: skinColor });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 3.1 * charData.height;
    player.add(head);

    // Eyes - different styles based on expression
    const eyeGeometry = facialExpression === "wink" 
      ? new THREE.BoxGeometry(0.15 * charData.height, 0.05 * charData.height, 0.05)
      : facialExpression === "surprised"
      ? new THREE.BoxGeometry(0.2 * charData.height, 0.2 * charData.height, 0.05)
      : new THREE.BoxGeometry(0.15 * charData.height, 0.15 * charData.height, 0.05);
    const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.2 * charData.width, 3.15 * charData.height, 0.31 * charData.width);
    player.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    if (facialExpression === "wink") {
      rightEye.scale.y = 3;
      rightEye.position.set(0.2 * charData.width, 3.15 * charData.height, 0.31 * charData.width);
    } else {
      rightEye.position.set(0.2 * charData.width, 3.15 * charData.height, 0.31 * charData.width);
    }
    player.add(rightEye);

    // Mouth - different shapes based on expression
    let mouthGeometry;
    if (facialExpression === "happy") {
      mouthGeometry = new THREE.BoxGeometry(0.3 * charData.height, 0.08 * charData.height, 0.05);
    } else if (facialExpression === "sad") {
      mouthGeometry = new THREE.BoxGeometry(0.3 * charData.height, 0.08 * charData.height, 0.05);
    } else if (facialExpression === "surprised") {
      mouthGeometry = new THREE.BoxGeometry(0.15 * charData.height, 0.15 * charData.height, 0.05);
    } else if (facialExpression === "angry") {
      mouthGeometry = new THREE.BoxGeometry(0.35 * charData.height, 0.06 * charData.height, 0.05);
    } else {
      mouthGeometry = new THREE.BoxGeometry(0.3 * charData.height, 0.08 * charData.height, 0.05);
    }
    
    const mouthMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
    const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
    
    if (facialExpression === "sad") {
      mouth.position.set(0, 2.8 * charData.height, 0.31 * charData.width);
      mouth.rotation.z = Math.PI;
    } else if (facialExpression === "angry") {
      mouth.position.set(0, 2.82 * charData.height, 0.31 * charData.width);
      mouth.rotation.z = Math.PI * 0.05;
    } else if (facialExpression === "surprised") {
      mouth.position.set(0, 2.82 * charData.height, 0.31 * charData.width);
    } else {
      mouth.position.set(0, 2.85 * charData.height, 0.31 * charData.width);
    }
    player.add(mouth);

    // Hair (blocky top)
    const hairGeometry = new THREE.BoxGeometry(
      0.85 * charData.height,
      0.3 * charData.height,
      0.85 * charData.height
    );
    const hairMaterial = new THREE.MeshLambertMaterial({ color: 0x2c1810 });
    const hair = new THREE.Mesh(hairGeometry, hairMaterial);
    hair.position.y = 3.55 * charData.height;
    player.add(hair);

    // Left Arm
    const armGeometry = new THREE.BoxGeometry(
      0.4 * charData.width,
      1.6 * charData.height,
      0.4 * charData.width
    );
    const armMaterial = new THREE.MeshLambertMaterial({ color: skinColor });
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.8 * charData.width, 1.8 * charData.height, 0);
    player.add(leftArm);

    // Right Arm
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.8 * charData.width, 1.8 * charData.height, 0);
    player.add(rightArm);

    // Left Leg
    const legGeometry = new THREE.BoxGeometry(
      0.5 * charData.width,
      1.4 * charData.height,
      0.5 * charData.width
    );
    const legMaterial = new THREE.MeshLambertMaterial({ color: bodyColor });
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.35 * charData.width, 0.5 * charData.height, 0);
    player.add(leftLeg);

    // Right Leg
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.35 * charData.width, 0.5 * charData.height, 0);
    player.add(rightLeg);

    // Floating arrow above player - triangle pointing down
    const arrowShape = new THREE.Shape();
    arrowShape.moveTo(0, 0.5);      // top point
    arrowShape.lineTo(-0.5, -0.5);  // bottom left
    arrowShape.lineTo(0.5, -0.5);   // bottom right
    arrowShape.lineTo(0, 0.5);      // back to top
    
    const arrowGeometry = new THREE.ShapeGeometry(arrowShape);
    const arrowMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffff00,
      side: THREE.DoubleSide
    });
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    arrow.position.y = 5.5 * charData.height;
    arrow.rotation.x = Math.PI / 2; // Make it horizontal so it's visible from above
    
    // Store animation data
    arrow.userData.isPlayerArrow = true;
    arrow.userData.baseY = 5.5 * charData.height;
    
    player.add(arrow);

    return player;
  };

  const updatePlayerAppearance = (charData: CharacterCustomizationData = currentCharacterData) => {
    if (playerRef.current && sceneRef.current) {
      const oldPosition = playerRef.current.position.clone();
      sceneRef.current.remove(playerRef.current);
      const newPlayer = createPlayer(charData);
      newPlayer.position.copy(oldPosition);
      sceneRef.current.add(newPlayer);
      playerRef.current = newPlayer;
    }
  };

  const handleCharacterUpdate = async (data: CharacterCustomizationData) => {
    setCurrentCharacterData(data);
    
    try {
      await supabase
        .from("character_customization")
        .update({
          height: data.height,
          width: data.width,
          body_color: data.body_color,
          skin_color: data.skin_color,
          facial_expression: data.facial_expression,
          shirt_pattern: data.shirt_pattern,
        })
        .eq("user_id", userId);

      toast.success("Character updated!");
      setIsEditingCharacter(false);
      
      // If we came from dashboard, return to dashboard
      if (returnToDashboard) {
        setShowDashboard(true);
        setReturnToDashboard(false);
      }
      
      // Pass the new data directly to avoid state timing issues
      updatePlayerAppearance(data);
    } catch (error) {
      console.error("Error updating character:", error);
      toast.error("Failed to update character");
    }
  };

  const createBuildings = (scene: THREE.Scene) => {
    const buildings: THREE.Group[] = [];
    const positions = [
      { x: -25, z: -25, companyIndex: 0 },
      { x: 25, z: -25, companyIndex: 1 },
      { x: -25, z: 25, companyIndex: 2 },
      { x: 25, z: 25, companyIndex: 3 },
    ];

    positions.forEach(({ x, z, companyIndex }) => {
      const building = new THREE.Group();
      const company = companies[companyIndex];

      // Main building - village shop style (smaller and cozy)
      const storeGeometry = new THREE.BoxGeometry(15, 12, 15);
      const storeMaterial = new THREE.MeshLambertMaterial({ color: company.color });
      const store = new THREE.Mesh(storeGeometry, storeMaterial);
      store.position.y = 6;
      building.add(store);

      // Add glowing outline effect
      const outlineGeometry = new THREE.BoxGeometry(15.5, 12.5, 15.5);
      const outlineMaterial = new THREE.MeshBasicMaterial({ 
        color: company.color, 
        transparent: true, 
        opacity: 0.3,
        side: THREE.BackSide 
      });
      const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
      outline.position.y = 6;
      building.add(outline);

      // Windows (front)
      const windowMaterial = new THREE.MeshBasicMaterial({ color: 0xffffcc });
      const window1 = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), windowMaterial);
      window1.position.set(-3, 6, 7.6);
      building.add(window1);
      
      const window2 = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), windowMaterial);
      window2.position.set(3, 6, 7.6);
      building.add(window2);

      // Door
      const doorGeometry = new THREE.PlaneGeometry(3, 5);
      const doorMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
      const door = new THREE.Mesh(doorGeometry, doorMaterial);
      door.position.set(0, 2.5, 7.6);
      building.add(door);

      // Triangular roof
      const roofGeometry = new THREE.ConeGeometry(11, 4, 4);
      const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
      const roof = new THREE.Mesh(roofGeometry, roofMaterial);
      roof.position.y = 14;
      roof.rotation.y = Math.PI / 4;
      building.add(roof);

      // Add company name sign at entrance
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 60px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(company.name, canvas.width / 2, canvas.height / 2);
      }
      const signTexture = new THREE.CanvasTexture(canvas);
      const signMaterial = new THREE.MeshBasicMaterial({ map: signTexture });
      const signMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(8, 2),
        signMaterial
      );
      signMesh.position.set(0, 3, 8.1);
      building.add(signMesh);

      building.position.set(x, 0, z);
      building.userData = company;

      buildings.push(building);
      scene.add(building);
    });

    return buildings;
  };

  const handleResize = () => {
    if (cameraRef.current && rendererRef.current) {
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    }
  };

  const animate = () => {
    animationIdRef.current = requestAnimationFrame(animate);

    if (playerRef.current && cameraRef.current) {
      const speed = 0.5;
      if (keysRef.current["ArrowUp"]) {
        playerRef.current.position.z -= speed;
      }
      if (keysRef.current["ArrowDown"]) {
        playerRef.current.position.z += speed;
      }
      if (keysRef.current["ArrowLeft"]) {
        playerRef.current.position.x -= speed;
      }
      if (keysRef.current["ArrowRight"]) {
        playerRef.current.position.x += speed;
      }

      // Boundary collision - keep player inside the wooden fence
      const boundaryLimit = 73; // Slightly inside the fence at 75
      playerRef.current.position.x = Math.max(-boundaryLimit, Math.min(boundaryLimit, playerRef.current.position.x));
      playerRef.current.position.z = Math.max(-boundaryLimit, Math.min(boundaryLimit, playerRef.current.position.z));

      // Camera follows player at eye level (third-person)
      cameraRef.current.position.set(
        playerRef.current.position.x,
        playerRef.current.position.y + 6,
        playerRef.current.position.z + 12
      );
      
      cameraRef.current.lookAt(
        playerRef.current.position.x,
        playerRef.current.position.y + 3,
        playerRef.current.position.z
      );

      checkBuildingProximity();
    }

    // Animate NPCs
    npcsRef.current.forEach(npc => {
      // Move NPC
      npc.mesh.position.add(npc.direction.clone().multiplyScalar(npc.speed));
      
      // Make NPC face movement direction
      npc.mesh.rotation.y = Math.atan2(npc.direction.x, npc.direction.z);
      
      // Bobbing animation for walking effect (keeping NPCs grounded)
      npc.mesh.position.y = Math.abs(Math.sin(Date.now() * 0.01 * npc.speed * 50)) * 0.05;
      
      // Change direction occasionally or when hitting boundaries
      npc.nextTurn--;
      if (npc.nextTurn <= 0 || 
          Math.abs(npc.mesh.position.x) > 40 || 
          Math.abs(npc.mesh.position.z) > 40) {
        npc.direction = new THREE.Vector3(
          Math.random() - 0.5,
          0,
          Math.random() - 0.5
        ).normalize();
        npc.nextTurn = Math.random() * 300 + 100;
      }
    });

    // Animate building beacons
    buildingsRef.current.forEach(building => {
      building.children.forEach(child => {
        if (child.userData.isBeacon) {
          child.rotation.y += 0.05;
        }
      });
    });

    // Animate player arrow
    if (playerRef.current) {
      playerRef.current.children.forEach(child => {
        if (child.userData.isPlayerArrow) {
          // Bobbing animation
          const bobAmount = Math.sin(Date.now() * 0.003) * 0.3;
          child.position.y = child.userData.baseY + bobAmount;
          // Gentle rotation
          child.rotation.y += 0.02;
        }
      });
    }

    if (sceneRef.current && cameraRef.current && rendererRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  };

  const checkBuildingProximity = () => {
    if (!playerRef.current) return;

    const playerPos = playerRef.current.position;
    let nearBuilding: THREE.Group | null = null;
    let nearestCompany: Company | null = null;

    buildingsRef.current.forEach((building) => {
      const distance = playerPos.distanceTo(building.position);
      if (distance < 12) {
        nearBuilding = building;
        nearestCompany = building.userData as Company;
      }
    });

    // Always update company state based on proximity
    // This ensures the popup disappears when stepping away
    if (nearestCompany) {
      setCurrentCompany(nearestCompany);
    } else {
      setCurrentCompany(null);
    }
  };

  const handleSellData = async (dataType: string, price: number) => {
    if (!userId || !currentCompany) return;

    const newDataTypes = { ...gameState.data_types };
    const currentTime = Date.now();
    newDataTypes[dataType] = { 
      ...newDataTypes[dataType], 
      owned: false,
      lastCollectedTime: currentTime
    };

    const newCoins = gameState.coins + price;
    const newExp = gameState.exp + 10;
    let newLevel = gameState.level;

    if (newExp >= newLevel * 100) {
      newLevel++;
    }

    const newGameState = {
      ...gameState,
      coins: newCoins,
      exp: newExp >= newLevel * 100 ? 0 : newExp,
      level: newLevel,
      data_types: newDataTypes,
    };

    setGameState(newGameState);

    try {
      // Update game state in database
      await supabase
        .from("game_state")
        .update({
          coins: newCoins,
          exp: newGameState.exp,
          level: newLevel,
          data_types: newDataTypes as any,
        })
        .eq("user_id", userId);

      // Record earnings in history
      await supabase
        .from("earnings_history")
        .insert({
          user_id: userId,
          amount: price,
          data_type: dataType,
          company_name: currentCompany.name,
        });

      toast.success(`Sold ${dataType} for ${price} coins!`);
    } catch (error) {
      console.error("Error updating game state:", error);
    }
  };

  const loadQuestionnaireData = async () => {
    const { data } = await supabase
      .from("questionnaire_responses")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (data) {
      setQuestionnaireData({
        name: data.name || "",
        age: data.age || "",
        location: data.location || "",
        occupation: data.occupation || "",
        devices: data.devices || [],
        social_media: data.social_media || [],
        screen_time: data.screen_time || "",
        shopping_freq: data.shopping_freq || "",
        shopping_categories: data.shopping_categories || [],
        fitness: data.fitness || "",
        interests: data.interests || "",
        privacy_concern: data.privacy_concern || "",
        data_sharing: data.data_sharing || "",
        email: data.email || "",
      });
    }
  };

  const handleCheckboxChange = (field: keyof QuestionnaireData, value: string, checked: boolean) => {
    const currentValues = (questionnaireData[field] as string[]) || [];
    setQuestionnaireData({
      ...questionnaireData,
      [field]: checked
        ? [...currentValues, value]
        : currentValues.filter((v) => v !== value),
    });
  };

  const handleUpdateQuestionnaire = async () => {
    try {
      await supabase
        .from("questionnaire_responses")
        .update({
          name: questionnaireData.name,
          age: questionnaireData.age,
          location: questionnaireData.location,
          occupation: questionnaireData.occupation,
          devices: questionnaireData.devices,
          social_media: questionnaireData.social_media,
          screen_time: questionnaireData.screen_time,
          shopping_freq: questionnaireData.shopping_freq,
          shopping_categories: questionnaireData.shopping_categories,
          fitness: questionnaireData.fitness,
          interests: questionnaireData.interests,
          privacy_concern: questionnaireData.privacy_concern,
          data_sharing: questionnaireData.data_sharing,
          email: questionnaireData.email,
        })
        .eq("user_id", userId);

      toast.success("Information updated successfully!");
      setShowQuestionnaireEditor(false);
    } catch (error) {
      console.error("Error updating questionnaire:", error);
      toast.error("Failed to update information");
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
      <GameUI 
        gameState={gameState} 
        onLogout={onLogout} 
        onEditCharacter={() => setIsEditingCharacter(true)}
        onOpenDashboard={() => setShowDashboard(true)}
        onOpenWithdraw={() => {
          setOpenWithdrawalOnDashboard(true);
          setShowDashboard(true);
        }}
        onGoHome={onGoHome}
        onUpdateInfo={() => setShowQuestionnaireEditor(true)}
      />
      <DataPanel dataTypes={gameState.data_types} />
      {currentCompany && (
        <InteractionPrompt
          company={currentCompany}
          dataTypes={gameState.data_types}
          onSell={handleSellData}
          onClose={() => setCurrentCompany(null)}
        />
      )}
      {showDashboard && (
        <Dashboard 
          userId={userId} 
          characterData={currentCharacterData} 
          onClose={() => {
            setShowDashboard(false);
            setOpenWithdrawalOnDashboard(false);
          }}
          onEditCharacter={() => {
            setShowDashboard(false);
            setReturnToDashboard(true);
            setIsEditingCharacter(true);
          }}
          onUpdateInfo={() => {
            setShowDashboard(false);
            setShowQuestionnaireEditor(true);
          }}
          openWithdrawal={openWithdrawalOnDashboard}
        />
      )}
      {isEditingCharacter && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-background p-8 rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Edit Character</h2>
              <button
                onClick={() => {
                  setIsEditingCharacter(false);
                  if (returnToDashboard) {
                    setShowDashboard(true);
                    setReturnToDashboard(false);
                  }
                }}
                className="text-muted-foreground hover:text-foreground text-2xl"
              >
                ×
              </button>
            </div>
            <CharacterCustomization
              initialData={currentCharacterData}
              onComplete={handleCharacterUpdate}
            />
          </div>
        </div>
      )}
      {showQuestionnaireEditor && (
        <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card/95 backdrop-blur-xl border-b border-border p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-foreground">Update Your Information</h2>
              <Button onClick={() => setShowQuestionnaireEditor(false)} variant="ghost" size="icon" className="rounded-full">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="edit-name">Name</Label>
                    <Input
                      id="edit-name"
                      value={questionnaireData.name}
                      onChange={(e) => setQuestionnaireData({ ...questionnaireData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-age">Age Range</Label>
                    <Select value={questionnaireData.age} onValueChange={(value) => setQuestionnaireData({ ...questionnaireData, age: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="18-24">18-24</SelectItem>
                        <SelectItem value="25-34">25-34</SelectItem>
                        <SelectItem value="35-44">35-44</SelectItem>
                        <SelectItem value="45-54">45-54</SelectItem>
                        <SelectItem value="55+">55+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-location">Location</Label>
                    <Input
                      id="edit-location"
                      value={questionnaireData.location}
                      onChange={(e) => setQuestionnaireData({ ...questionnaireData, location: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-occupation">Occupation</Label>
                    <Input
                      id="edit-occupation"
                      value={questionnaireData.occupation}
                      onChange={(e) => setQuestionnaireData({ ...questionnaireData, occupation: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Digital Life */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Digital Life & Habits</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="mb-3 block">Devices You Use</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: "smartphone", label: "Smartphone" },
                        { value: "laptop", label: "Laptop" },
                        { value: "tablet", label: "Tablet" },
                        { value: "smartwatch", label: "Smart Watch" },
                        { value: "smarthome", label: "Smart Home Devices" },
                      ].map((device) => (
                        <div key={device.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-${device.value}`}
                            checked={questionnaireData.devices?.includes(device.value)}
                            onCheckedChange={(checked) => handleCheckboxChange("devices", device.value, checked as boolean)}
                          />
                          <Label htmlFor={`edit-${device.value}`} className="cursor-pointer">{device.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="mb-3 block">Social Media Platforms</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: "facebook", label: "Facebook" },
                        { value: "instagram", label: "Instagram" },
                        { value: "twitter", label: "Twitter/X" },
                        { value: "linkedin", label: "LinkedIn" },
                        { value: "tiktok", label: "TikTok" },
                        { value: "youtube", label: "YouTube" },
                      ].map((platform) => (
                        <div key={platform.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-${platform.value}`}
                            checked={questionnaireData.social_media?.includes(platform.value)}
                            onCheckedChange={(checked) => handleCheckboxChange("social_media", platform.value, checked as boolean)}
                          />
                          <Label htmlFor={`edit-${platform.value}`} className="cursor-pointer">{platform.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="edit-screen-time">Daily Hours Online</Label>
                    <Select value={questionnaireData.screen_time} onValueChange={(value) => setQuestionnaireData({ ...questionnaireData, screen_time: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-3">1-3 hours</SelectItem>
                        <SelectItem value="4-6">4-6 hours</SelectItem>
                        <SelectItem value="7-9">7-9 hours</SelectItem>
                        <SelectItem value="10+">10+ hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Shopping & Health */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Shopping & Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="edit-shopping-freq">Online Shopping Frequency</Label>
                    <Select value={questionnaireData.shopping_freq} onValueChange={(value) => setQuestionnaireData({ ...questionnaireData, shopping_freq: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="rarely">Rarely</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="mb-3 block">Shopping Categories</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: "clothing", label: "Clothing" },
                        { value: "electronics", label: "Electronics" },
                        { value: "food", label: "Food & Groceries" },
                        { value: "books", label: "Books" },
                        { value: "travel", label: "Travel" },
                        { value: "health", label: "Health Products" },
                      ].map((category) => (
                        <div key={category.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-${category.value}`}
                            checked={questionnaireData.shopping_categories?.includes(category.value)}
                            onCheckedChange={(checked) => handleCheckboxChange("shopping_categories", category.value, checked as boolean)}
                          />
                          <Label htmlFor={`edit-${category.value}`} className="cursor-pointer">{category.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="edit-fitness">Fitness Tracking</Label>
                    <Select value={questionnaireData.fitness} onValueChange={(value) => setQuestionnaireData({ ...questionnaireData, fitness: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes-regularly">Yes, regularly</SelectItem>
                        <SelectItem value="yes-occasionally">Yes, occasionally</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="edit-interests">Interests/Hobbies</Label>
                    <Textarea
                      id="edit-interests"
                      value={questionnaireData.interests}
                      onChange={(e) => setQuestionnaireData({ ...questionnaireData, interests: e.target.value })}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Privacy */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Privacy & Data Sharing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="edit-privacy">Privacy Concern Level</Label>
                    <Select value={questionnaireData.privacy_concern} onValueChange={(value) => setQuestionnaireData({ ...questionnaireData, privacy_concern: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="very-concerned">Very concerned</SelectItem>
                        <SelectItem value="somewhat-concerned">Somewhat concerned</SelectItem>
                        <SelectItem value="not-very-concerned">Not very concerned</SelectItem>
                        <SelectItem value="not-concerned">Not concerned at all</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="edit-data-sharing">Data Sharing for Benefits</Label>
                    <Select value={questionnaireData.data_sharing} onValueChange={(value) => setQuestionnaireData({ ...questionnaireData, data_sharing: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="frequently">Frequently</SelectItem>
                        <SelectItem value="sometimes">Sometimes</SelectItem>
                        <SelectItem value="rarely">Rarely</SelectItem>
                        <SelectItem value="never">Never</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button onClick={() => setShowQuestionnaireEditor(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleUpdateQuestionnaire} className="flex-1">
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Game3D;
