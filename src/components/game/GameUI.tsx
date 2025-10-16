import { Button } from "@/components/ui/button";
import type { GameStateData } from "@/types/game";

interface GameUIProps {
  gameState: GameStateData;
  onLogout: () => void;
  onEditCharacter: () => void;
}

const GameUI = ({ gameState, onLogout, onEditCharacter }: GameUIProps) => {
  return (
    <>
      <div className="absolute top-5 left-5 bg-black/80 backdrop-blur-lg text-white p-4 rounded-lg">
        <h3 className="font-bold mb-2">💰 Data Coins: {gameState.coins}</h3>
        <div>Level: {gameState.level}</div>
        <div>Experience: {gameState.exp}</div>
        <div className="flex gap-2 mt-2">
          <Button onClick={onEditCharacter} variant="secondary" size="sm">
            Edit Character
          </Button>
          <Button onClick={onLogout} variant="destructive" size="sm">
            Logout
          </Button>
        </div>
      </div>

      <div className="absolute bottom-5 left-5 bg-black/80 backdrop-blur-lg text-white p-4 rounded-lg">
        <div className="font-bold mb-2">Controls:</div>
        <div>⬆️⬇️⬅️➡️ Arrow Keys - Move</div>
        <div>🖱️ Mouse - Navigate camera view</div>
        <div>💼 Walk to buildings to sell data</div>
      </div>
    </>
  );
};

export default GameUI;
