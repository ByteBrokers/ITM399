import { Button } from "@/components/ui/button";
import type { GameStateData } from "@/types/game";

interface GameUIProps {
  gameState: GameStateData;
  onLogout: () => void;
}

const GameUI = ({ gameState, onLogout }: GameUIProps) => {
  return (
    <>
      <div className="absolute top-5 left-5 bg-black/80 backdrop-blur-lg text-white p-4 rounded-lg">
        <h3 className="font-bold mb-2">💰 Data Coins: {gameState.coins}</h3>
        <div>Level: {gameState.level}</div>
        <div>Experience: {gameState.exp}</div>
        <Button onClick={onLogout} variant="destructive" size="sm" className="mt-2">
          Logout
        </Button>
      </div>

      <div className="absolute bottom-5 left-5 bg-black/80 backdrop-blur-lg text-white p-4 rounded-lg">
        <div className="font-bold mb-2">Controls:</div>
        <div>🎮 WASD - Move</div>
        <div>🖱️ Mouse - Look Around</div>
        <div>💼 Walk to buildings to sell data</div>
      </div>
    </>
  );
};

export default GameUI;
