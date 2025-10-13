import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import GameUI from "./GameUI";
import DataPanel from "./DataPanel";
import InteractionPrompt from "./InteractionPrompt";
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

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const playerRef = useRef<THREE.Group | null>(null);
  const buildingsRef = useRef<THREE.Group[]>([]);
  const keysRef = useRef<Record<string, boolean>>({});
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

  const initThreeJS = () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    containerRef.current!.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x3cb371 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

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

  const createPlayer = () => {
    const player = new THREE.Group();

    const bodyColor = parseInt(characterData.body_color.replace("#", "0x"));
    const skinColor = parseInt(characterData.skin_color.replace("#", "0x"));

    const bodyGeometry = new THREE.CylinderGeometry(
      characterData.width,
      characterData.width,
      3 * characterData.height
    );
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: bodyColor });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1.5 * characterData.height;
    body.castShadow = true;
    player.add(body);

    const headGeometry = new THREE.SphereGeometry(0.6 * characterData.height);
    const headMaterial = new THREE.MeshLambertMaterial({ color: skinColor });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 3.6 * characterData.height;
    head.castShadow = true;
    player.add(head);

    return player;
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

      const storeGeometry = new THREE.BoxGeometry(12, 8, 10);
      const storeMaterial = new THREE.MeshLambertMaterial({ color: company.color });
      const store = new THREE.Mesh(storeGeometry, storeMaterial);
      store.position.y = 4;
      store.castShadow = true;
      building.add(store);

      const roofGeometry = new THREE.ConeGeometry(8, 3, 4);
      const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
      const roof = new THREE.Mesh(roofGeometry, roofMaterial);
      roof.position.y = 9.5;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      building.add(roof);

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
      if (keysRef.current["KeyW"] || keysRef.current["ArrowUp"]) {
        playerRef.current.position.z -= speed;
      }
      if (keysRef.current["KeyS"] || keysRef.current["ArrowDown"]) {
        playerRef.current.position.z += speed;
      }
      if (keysRef.current["KeyA"] || keysRef.current["ArrowLeft"]) {
        playerRef.current.position.x -= speed;
      }
      if (keysRef.current["KeyD"] || keysRef.current["ArrowRight"]) {
        playerRef.current.position.x += speed;
      }

      cameraRef.current.position.x = playerRef.current.position.x;
      cameraRef.current.position.z = playerRef.current.position.z + 20;
      cameraRef.current.lookAt(
        playerRef.current.position.x,
        playerRef.current.position.y + 5,
        playerRef.current.position.z
      );

      checkBuildingProximity();
    }

    if (sceneRef.current && cameraRef.current && rendererRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  };

  const checkBuildingProximity = () => {
    if (!playerRef.current) return;

    const playerPos = playerRef.current.position;
    let nearBuilding: THREE.Group | null = null;

    buildingsRef.current.forEach((building) => {
      const distance = playerPos.distanceTo(building.position);
      if (distance < 12) {
        nearBuilding = building;
      }
    });

    if (nearBuilding && nearBuilding.userData !== currentCompany) {
      setCurrentCompany(nearBuilding.userData as Company);
    } else if (!nearBuilding && currentCompany) {
      setCurrentCompany(null);
    }
  };

  const handleSellData = async (dataType: string, price: number) => {
    const newDataTypes = { ...gameState.data_types };
    newDataTypes[dataType] = { ...newDataTypes[dataType], owned: false };

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
      await supabase
        .from("game_state")
        .update({
          coins: newCoins,
          exp: newGameState.exp,
          level: newLevel,
          data_types: newDataTypes,
        })
        .eq("user_id", userId);

      toast.success(`Sold ${dataType} for ${price} coins!`);

      setTimeout(() => {
        newDataTypes[dataType].owned = true;
        setGameState((prev) => ({ ...prev, data_types: newDataTypes }));
      }, 10000);
    } catch (error) {
      console.error("Error updating game state:", error);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
      <GameUI gameState={gameState} onLogout={onLogout} />
      <DataPanel dataTypes={gameState.data_types} />
      {currentCompany && (
        <InteractionPrompt
          company={currentCompany}
          dataTypes={gameState.data_types}
          onSell={handleSellData}
          onClose={() => setCurrentCompany(null)}
        />
      )}
    </div>
  );
};

export default Game3D;
