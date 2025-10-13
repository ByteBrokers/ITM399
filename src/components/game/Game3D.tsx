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

  const createCityEnvironment = (scene: THREE.Scene) => {
    // Create footpaths (narrower and more path-like)
    const footpathMaterial = new THREE.MeshLambertMaterial({ color: 0x8b7355 });
    
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

    // Create trees
    const treePositions = [
      { x: -15, z: -15 }, { x: -15, z: 15 }, { x: 15, z: -15 }, { x: 15, z: 15 },
      { x: -35, z: -35 }, { x: -35, z: 35 }, { x: 35, z: -35 }, { x: 35, z: 35 },
      { x: -40, z: 0 }, { x: 40, z: 0 }, { x: 0, z: -40 }, { x: 0, z: 40 },
      { x: -20, z: -30 }, { x: 20, z: -30 }, { x: -20, z: 30 }, { x: 20, z: 30 }
    ];

    treePositions.forEach(pos => {
      const tree = new THREE.Group();
      
      // Trunk (much taller)
      const trunkGeometry = new THREE.CylinderGeometry(0.4, 0.5, 8);
      const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      trunk.position.y = 4;
      trunk.castShadow = true;
      tree.add(trunk);

      // Foliage (larger and higher)
      const foliageGeometry = new THREE.SphereGeometry(3, 8, 8);
      const foliageMaterial = new THREE.MeshLambertMaterial({ color: 0x228b22 });
      const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
      foliage.position.y = 10;
      foliage.castShadow = true;
      tree.add(foliage);

      tree.position.set(pos.x, 0, pos.z);
      scene.add(tree);
    });

    // Create benches
    const benchPositions = [
      { x: -8, z: -8 }, { x: 8, z: -8 }, { x: -8, z: 8 }, { x: 8, z: 8 },
      { x: -18, z: 0 }, { x: 18, z: 0 }, { x: 0, z: -18 }, { x: 0, z: 18 }
    ];

    benchPositions.forEach(pos => {
      const bench = new THREE.Group();

      // Seat (lower and more proportional)
      const seatGeometry = new THREE.BoxGeometry(1.8, 0.15, 0.5);
      const seatMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
      const seat = new THREE.Mesh(seatGeometry, seatMaterial);
      seat.position.y = 0.4;
      bench.add(seat);

      // Backrest (proportional)
      const backGeometry = new THREE.BoxGeometry(1.8, 0.7, 0.08);
      const back = new THREE.Mesh(backGeometry, seatMaterial);
      back.position.set(0, 0.75, -0.2);
      bench.add(back);

      // Legs (thinner and shorter)
      for (let i = 0; i < 4; i++) {
        const legGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.4);
        const legMaterial = new THREE.MeshLambertMaterial({ color: 0x2c2c2c });
        const leg = new THREE.Mesh(legGeometry, legMaterial);
        leg.position.set(i < 2 ? -0.7 : 0.7, 0.2, i % 2 === 0 ? 0.15 : -0.15);
        bench.add(leg);
      }

      bench.position.set(pos.x, 0, pos.z);
      scene.add(bench);
    });

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
      building.castShadow = true;
      shop.add(building);

      // Simple roof
      const roofGeometry = new THREE.BoxGeometry(6.5, 0.4, 5.5);
      const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x4a4a4a });
      const roof = new THREE.Mesh(roofGeometry, roofMaterial);
      roof.position.y = 6.2;
      roof.castShadow = true;
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
      post.castShadow = true;
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
          data_types: newDataTypes as any,
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
