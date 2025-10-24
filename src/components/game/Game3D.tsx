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
import type { CharacterCustomizationData, GameStateData, Company } from "@/types/game";

interface Game3DProps {
  characterData: CharacterCustomizationData;
  initialGameState: GameStateData;
  userId: string;
  onLogout: () => void;
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

const Game3D = ({ characterData, initialGameState, userId, onLogout }: Game3DProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState(initialGameState);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [isEditingCharacter, setIsEditingCharacter] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [returnToDashboard, setReturnToDashboard] = useState(false);
  const [currentCharacterData, setCurrentCharacterData] = useState(characterData);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const playerRef = useRef<THREE.Group | null>(null);
  const buildingsRef = useRef<THREE.Group[]>([]);
  const npcsRef = useRef<Array<{ mesh: THREE.Group; speed: number; direction: THREE.Vector3; nextTurn: number }>>([]);
  const keysRef = useRef<Record<string, boolean>>({});
  const mouseRef = useRef({ isDragging: false, previousX: 0, previousY: 0 });
  const cameraAngleRef = useRef({ horizontal: 0, vertical: 0.3 });
  const animationIdRef = useRef<number>();

  useEffect(() => {
    if (!containerRef.current) return;

    initThreeJS();
    animate();

    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    const handleMouseDown = (e: MouseEvent) => {
      mouseRef.current.isDragging = true;
      mouseRef.current.previousX = e.clientX;
      mouseRef.current.previousY = e.clientY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (mouseRef.current.isDragging) {
        const deltaX = e.clientX - mouseRef.current.previousX;
        const deltaY = e.clientY - mouseRef.current.previousY;

        cameraAngleRef.current.horizontal -= deltaX * 0.005;
        cameraAngleRef.current.vertical -= deltaY * 0.005;
        
        // Clamp vertical angle
        cameraAngleRef.current.vertical = Math.max(-Math.PI / 3, Math.min(Math.PI / 2, cameraAngleRef.current.vertical));

        mouseRef.current.previousX = e.clientX;
        mouseRef.current.previousY = e.clientY;
      }
    };

    const handleMouseUp = () => {
      mouseRef.current.isDragging = false;
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
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

    // Ground - natural grass color
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x6b8e23 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    
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

    // Create multiple clouds at different positions
    const cloudPositions = [
      { x: -40, y: 60, z: -30 },
      { x: 30, y: 55, z: -40 },
      { x: -20, y: 65, z: 40 },
      { x: 50, y: 58, z: 20 },
      { x: 0, y: 70, z: -60 },
      { x: -50, y: 62, z: 30 },
      { x: 40, y: 68, z: -20 },
      { x: -30, y: 56, z: -50 },
      { x: 20, y: 64, z: 50 },
      { x: 60, y: 60, z: -10 },
    ];

    cloudPositions.forEach(pos => {
      const cloud = new THREE.Group();
      
      // Create cloud from multiple spheres for a fluffy look
      const sphereGeometry = new THREE.SphereGeometry(3, 8, 8);
      
      for (let i = 0; i < 5; i++) {
        const sphere = new THREE.Mesh(sphereGeometry, cloudMaterial);
        const offsetX = (Math.random() - 0.5) * 6;
        const offsetY = (Math.random() - 0.5) * 2;
        const offsetZ = (Math.random() - 0.5) * 4;
        const scale = 0.7 + Math.random() * 0.6;
        
        sphere.position.set(offsetX, offsetY, offsetZ);
        sphere.scale.set(scale, scale * 0.7, scale);
        cloud.add(sphere);
      }
      
      cloud.position.set(pos.x, pos.y, pos.z);
      scene.add(cloud);
    });
  };

  const createCityEnvironment = (scene: THREE.Scene) => {
    // Create footpaths - natural stone path color
    const footpathMaterial = new THREE.MeshLambertMaterial({ color: 0xa89968 });
    
    // Main cross footpaths
    const horizontalPath = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 3),
      footpathMaterial
    );
    horizontalPath.rotation.x = -Math.PI / 2;
    horizontalPath.position.y = 0.01;
    scene.add(horizontalPath);

    const verticalPath = new THREE.Mesh(
      new THREE.PlaneGeometry(3, 120),
      footpathMaterial
    );
    verticalPath.rotation.x = -Math.PI / 2;
    verticalPath.position.y = 0.01;
    scene.add(verticalPath);

    // Additional connecting paths
    const sidePaths = [
      { x: -25, z: 0, rotation: 0, width: 3, length: 50 },
      { x: 25, z: 0, rotation: 0, width: 3, length: 50 },
      { x: 0, z: -25, rotation: Math.PI / 2, width: 3, length: 50 },
      { x: 0, z: 25, rotation: Math.PI / 2, width: 3, length: 50 }
    ];

    sidePaths.forEach(path => {
      const sidePath = new THREE.Mesh(
        new THREE.PlaneGeometry(path.length, path.width),
        footpathMaterial
      );
      sidePath.rotation.x = -Math.PI / 2;
      sidePath.rotation.z = path.rotation;
      sidePath.position.set(path.x, 0.01, path.z);
      scene.add(sidePath);
    });

    // Create trees (positioned away from footpaths)
    const treePositions = [
      { x: -15, z: -15 }, { x: -15, z: 15 }, { x: 15, z: -15 }, { x: 15, z: 15 },
      { x: -35, z: -35 }, { x: -35, z: 35 }, { x: 35, z: -35 }, { x: 35, z: 35 },
      { x: -40, z: -8 }, { x: 40, z: -8 }, { x: -8, z: -40 }, { x: 8, z: -40 },
      { x: -40, z: 8 }, { x: 40, z: 8 }, { x: 8, z: 40 }, { x: -8, z: 40 },
      { x: -20, z: -30 }, { x: 20, z: -30 }, { x: -20, z: 30 }, { x: 20, z: 30 }
    ];

    treePositions.forEach(pos => {
      const tree = new THREE.Group();
      
      // Trunk - natural brown bark
      const trunkGeometry = new THREE.CylinderGeometry(0.4, 0.5, 8);
      const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      trunk.position.y = 4;
      tree.add(trunk);

      // Foliage - natural forest green
      const foliageGeometry = new THREE.SphereGeometry(3, 8, 8);
      const foliageMaterial = new THREE.MeshLambertMaterial({ color: 0x2d5a1e });
      const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
      foliage.position.y = 10;
      tree.add(foliage);

      tree.position.set(pos.x, 0, pos.z);
      scene.add(tree);
    });

    // Create benches - more scattered around
    const benchPositions = [
      { x: -8, z: -8 }, { x: 8, z: -8 }, { x: -8, z: 8 }, { x: 8, z: 8 },
      { x: -18, z: 0 }, { x: 18, z: 0 }, { x: 0, z: -18 }, { x: 0, z: 18 },
      { x: -30, z: -10 }, { x: 30, z: -10 }, { x: -30, z: 10 }, { x: 30, z: 10 },
      { x: -10, z: -30 }, { x: 10, z: -30 }, { x: -10, z: 30 }, { x: 10, z: 30 },
      { x: -22, z: -22 }, { x: 22, z: -22 }, { x: -22, z: 22 }, { x: 22, z: 22 }
    ];

    benchPositions.forEach(pos => {
      const bench = new THREE.Group();

      // Seat (proper size)
      const seatGeometry = new THREE.BoxGeometry(3, 0.3, 1.2);
      const seatMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
      const seat = new THREE.Mesh(seatGeometry, seatMaterial);
      seat.position.y = 1;
      bench.add(seat);

      // Backrest (proper size)
      const backGeometry = new THREE.BoxGeometry(3, 1.5, 0.15);
      const back = new THREE.Mesh(backGeometry, seatMaterial);
      back.position.set(0, 1.8, -0.5);
      bench.add(back);

      // Legs (proper size)
      for (let i = 0; i < 4; i++) {
        const legGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1);
        const legMaterial = new THREE.MeshLambertMaterial({ color: 0x2c2c2c });
        const leg = new THREE.Mesh(legGeometry, legMaterial);
        leg.position.set(i < 2 ? -1.2 : 1.2, 0.5, i % 2 === 0 ? 0.4 : -0.4);
        bench.add(leg);
      }

      bench.position.set(pos.x, 0, pos.z);
      scene.add(bench);
    });

    // Create bushes
    const bushPositions = [
      { x: -12, z: -12 }, { x: 12, z: -12 }, { x: -12, z: 12 }, { x: 12, z: 12 },
      { x: -25, z: -5 }, { x: 25, z: -5 }, { x: -25, z: 5 }, { x: 25, z: 5 },
      { x: -5, z: -25 }, { x: 5, z: -25 }, { x: -5, z: 25 }, { x: 5, z: 25 },
      { x: -35, z: -20 }, { x: 35, z: -20 }, { x: -35, z: 20 }, { x: 35, z: 20 },
      { x: -20, z: -35 }, { x: 20, z: -35 }, { x: -20, z: 35 }, { x: 20, z: 35 }
    ];

    bushPositions.forEach(pos => {
      const bush = new THREE.Group();
      
      // Main bush body - darker natural green
      const bushGeometry = new THREE.SphereGeometry(1.2, 6, 6);
      const bushMaterial = new THREE.MeshLambertMaterial({ color: 0x1e4620 });
      const bushMesh = new THREE.Mesh(bushGeometry, bushMaterial);
      bushMesh.position.y = 0.8;
      bushMesh.scale.set(1, 0.8, 1);
      bush.add(bushMesh);
      
      // Add smaller spheres for texture
      for (let i = 0; i < 3; i++) {
        const smallBush = new THREE.Mesh(
          new THREE.SphereGeometry(0.6, 5, 5),
          new THREE.MeshLambertMaterial({ color: 0x3a6b1f })
        );
        const angle = (i / 3) * Math.PI * 2;
        smallBush.position.set(
          Math.cos(angle) * 0.7,
          0.9,
          Math.sin(angle) * 0.7
        );
        bush.add(smallBush);
      }
      
      bush.position.set(pos.x, 0, pos.z);
      scene.add(bush);
    });

    // Create decorative plants
    const plantPositions = [
      { x: -6, z: -6 }, { x: 6, z: 6 }, { x: -6, z: 6 }, { x: 6, z: -6 },
      { x: -14, z: -8 }, { x: 14, z: -8 }, { x: -14, z: 8 }, { x: 14, z: 8 },
      { x: -8, z: -14 }, { x: 8, z: -14 }, { x: -8, z: 14 }, { x: 8, z: 14 },
      { x: -28, z: -18 }, { x: 28, z: -18 }, { x: -28, z: 18 }, { x: 28, z: 18 }
    ];

    plantPositions.forEach(pos => {
      const plant = new THREE.Group();
      
      // Pot
      const potGeometry = new THREE.CylinderGeometry(0.3, 0.25, 0.4, 8);
      const potMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
      const pot = new THREE.Mesh(potGeometry, potMaterial);
      pot.position.y = 0.2;
      plant.add(pot);
      
      // Leaves
      for (let i = 0; i < 5; i++) {
        const leafGeometry = new THREE.ConeGeometry(0.15, 0.8, 4);
        const leafMaterial = new THREE.MeshLambertMaterial({ color: 0x228b22 });
        const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
        const angle = (i / 5) * Math.PI * 2;
        leaf.position.set(
          Math.cos(angle) * 0.2,
          0.6 + Math.random() * 0.3,
          Math.sin(angle) * 0.2
        );
        leaf.rotation.z = Math.PI / 6;
        plant.add(leaf);
      }
      
      plant.position.set(pos.x, 0, pos.z);
      scene.add(plant);
    });

    // Add paths leading directly to marketplaces
    const marketplacePaths = [
      { startX: 0, startZ: 0, endX: -25, endZ: -25 }, // Top-left marketplace
      { startX: 0, startZ: 0, endX: 25, endZ: -25 },  // Top-right marketplace
      { startX: 0, startZ: 0, endX: -25, endZ: 25 },  // Bottom-left marketplace
      { startX: 0, startZ: 0, endX: 25, endZ: 25 }    // Bottom-right marketplace
    ];

    marketplacePaths.forEach(path => {
      const deltaX = path.endX - path.startX;
      const deltaZ = path.endZ - path.startZ;
      const length = Math.sqrt(deltaX * deltaX + deltaZ * deltaZ);
      const angle = Math.atan2(deltaZ, deltaX);
      
      const pathMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(length, 2.5),
        footpathMaterial
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

    // Create animated NPCs (people walking around) - scaled to realistic size
    for (let i = 0; i < 15; i++) {
      const npc = new THREE.Group();
      
      // Body - scaled up to be proportionate
      const bodyGeometry = new THREE.CylinderGeometry(0.6, 0.6, 2.5, 8);
      const bodyColors = [0x1e40af, 0x7c3aed, 0x059669, 0xdc2626, 0xf59e0b];
      const bodyMaterial = new THREE.MeshLambertMaterial({ 
        color: bodyColors[Math.floor(Math.random() * bodyColors.length)] 
      });
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.position.y = 1.25; // Adjusted so body sits on ground
      npc.add(body);
      
      // Head - scaled up proportionally
      const headGeometry = new THREE.SphereGeometry(0.5, 8, 8);
      const headMaterial = new THREE.MeshLambertMaterial({ color: 0xffdbac });
      const head = new THREE.Mesh(headGeometry, headMaterial);
      head.position.y = 3; // Adjusted to sit on top of body
      npc.add(head);
      
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

    // Create decorative small shops
    const shopPositions = [
      { x: -40, z: -15, color: 0xe6b800 },
      { x: -40, z: 15, color: 0xcc7a00 },
      { x: 40, z: -15, color: 0x006699 },
      { x: 40, z: 15, color: 0x99004d },
      { x: -15, z: -40, color: 0x009933 },
      { x: 15, z: -40, color: 0x8b008b },
      { x: -15, z: 40, color: 0xff6600 },
      { x: 15, z: 40, color: 0x4d4d4d }
    ];

    shopPositions.forEach(pos => {
      const shop = new THREE.Group();

      // Building (taller and more realistic)
      const buildingGeometry = new THREE.BoxGeometry(6, 6, 5);
      const buildingMaterial = new THREE.MeshLambertMaterial({ color: pos.color });
      const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
      building.position.y = 3;
      shop.add(building);

      // Simple roof
      const roofGeometry = new THREE.BoxGeometry(6.5, 0.4, 5.5);
      const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x4a4a4a });
      const roof = new THREE.Mesh(roofGeometry, roofMaterial);
      roof.position.y = 6.2;
      shop.add(roof);

      shop.position.set(pos.x, 0, pos.z);
      scene.add(shop);
    });

    // Create lampposts
    const lamppostPositions = [
      { x: -5, z: -5 }, { x: -5, z: 5 }, { x: 5, z: -5 }, { x: 5, z: 5 },
      { x: -15, z: 0 }, { x: 15, z: 0 }, { x: 0, z: -15 }, { x: 0, z: 15 },
      { x: -25, z: -12 }, { x: 25, z: -12 }, { x: -25, z: 12 }, { x: 25, z: 12 }
    ];

    lamppostPositions.forEach(pos => {
      const lamppost = new THREE.Group();

      // Post (taller)
      const postGeometry = new THREE.CylinderGeometry(0.12, 0.12, 6);
      const postMaterial = new THREE.MeshLambertMaterial({ color: 0x696969 });
      const post = new THREE.Mesh(postGeometry, postMaterial);
      post.position.y = 3;
      lamppost.add(post);

      // Light fixture
      const lightGeometry = new THREE.SphereGeometry(0.35);
      const lightMaterial = new THREE.MeshBasicMaterial({ color: 0xffff99 });
      const light = new THREE.Mesh(lightGeometry, lightMaterial);
      light.position.y = 6;
      lamppost.add(light);

      // Point light for illumination
      const pointLight = new THREE.PointLight(0xffff99, 0.5, 12);
      pointLight.position.y = 6;
      lamppost.add(pointLight);

      lamppost.position.set(pos.x, 0, pos.z);
      scene.add(lamppost);
    });
  };

  const createPlayer = (charData: CharacterCustomizationData = currentCharacterData) => {
    const player = new THREE.Group();

    const bodyColor = parseInt(charData.body_color.replace("#", "0x"));
    const skinColor = parseInt(charData.skin_color.replace("#", "0x"));

    // Torso (rectangular block)
    const torsoGeometry = new THREE.BoxGeometry(
      1.2 * charData.width,
      1.8 * charData.height,
      0.6 * charData.width
    );
    const torsoMaterial = new THREE.MeshLambertMaterial({ color: bodyColor });
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

      // Make store building taller and more distinctive
      const storeGeometry = new THREE.BoxGeometry(12, 12, 10);
      const storeMaterial = new THREE.MeshLambertMaterial({ color: company.color });
      const store = new THREE.Mesh(storeGeometry, storeMaterial);
      store.position.y = 6;
      building.add(store);

      // Add glowing outline effect
      const outlineGeometry = new THREE.BoxGeometry(12.5, 12.5, 10.5);
      const outlineMaterial = new THREE.MeshBasicMaterial({ 
        color: company.color, 
        transparent: true, 
        opacity: 0.3,
        side: THREE.BackSide 
      });
      const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
      outline.position.y = 6;
      building.add(outline);

      // Different colored roof
      const roofGeometry = new THREE.ConeGeometry(9, 4, 4);
      const roofMaterial = new THREE.MeshLambertMaterial({ color: company.color });
      const roof = new THREE.Mesh(roofGeometry, roofMaterial);
      roof.position.y = 14;
      roof.rotation.y = Math.PI / 4;
      building.add(roof);

      // Add rotating beacon on top
      const beaconGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
      const beaconMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
      const beacon = new THREE.Mesh(beaconGeometry, beaconMaterial);
      beacon.position.y = 15.5;
      beacon.userData.isBeacon = true;
      building.add(beacon);

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

      cameraRef.current.position.x = playerRef.current.position.x;
      cameraRef.current.position.z = playerRef.current.position.z + 20;
      
      // Apply camera angles for mouse look
      const distance = 20;
      const cameraOffset = new THREE.Vector3(
        Math.sin(cameraAngleRef.current.horizontal) * distance * Math.cos(cameraAngleRef.current.vertical),
        Math.sin(cameraAngleRef.current.vertical) * distance + 15,
        Math.cos(cameraAngleRef.current.horizontal) * distance * Math.cos(cameraAngleRef.current.vertical)
      );
      
      cameraRef.current.position.set(
        playerRef.current.position.x + cameraOffset.x,
        cameraOffset.y,
        playerRef.current.position.z + cameraOffset.z
      );
      
      cameraRef.current.lookAt(
        playerRef.current.position.x,
        playerRef.current.position.y + 5,
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

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
      <GameUI 
        gameState={gameState} 
        onLogout={onLogout} 
        onEditCharacter={() => setIsEditingCharacter(true)}
        onOpenDashboard={() => setShowDashboard(true)}
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
          onClose={() => setShowDashboard(false)}
          onEditCharacter={() => {
            setShowDashboard(false);
            setReturnToDashboard(true);
            setIsEditingCharacter(true);
          }}
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
    </div>
  );
};

export default Game3D;
