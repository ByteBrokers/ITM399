import { Button } from "@/components/ui/button";
import type { GameStateData } from "@/types/game";
import { BarChart3, UserPen, LogOut, Wallet } from "lucide-react";
import { toast } from "sonner";

interface GameUIProps {
  gameState: GameStateData;
  onLogout: () => void;
  onEditCharacter: () => void;
  onOpenDashboard: () => void;
}

const GameUI = ({ gameState, onLogout, onEditCharacter, onOpenDashboard }: GameUIProps) => {
  return (
    <>
      <div className="absolute top-6 left-6 bg-card/90 backdrop-blur-xl border border-border shadow-xl rounded-xl p-5 min-w-[240px]">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-xl">
            💰
          </div>
          <div>
            <div className="text-sm text-muted-foreground font-medium">Data Coins</div>
            <div className="text-2xl font-bold text-foreground">{gameState.coins}</div>
          </div>
        </div>
        
        <div className="space-y-2 mb-4 pb-4 border-b border-border">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Level</span>
            <span className="text-sm font-semibold text-foreground">{gameState.level}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Experience</span>
            <span className="text-sm font-semibold text-foreground">{gameState.exp}</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          <Button onClick={onOpenDashboard} variant="outline" size="sm" className="w-full justify-start">
            <BarChart3 className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
          <Button onClick={onEditCharacter} variant="outline" size="sm" className="w-full justify-start">
            <UserPen className="h-4 w-4 mr-2" />
            Edit Character
          </Button>
          <Button 
            onClick={() => toast.info("This is a work in progress")}
            variant="outline" 
            size="sm" 
            className="w-full justify-start"
          >
            <Wallet className="h-4 w-4 mr-2" />
            Withdraw
          </Button>
          <Button onClick={onLogout} variant="destructive" size="sm" className="w-full justify-start">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      <div className="absolute bottom-6 left-6 bg-card/90 backdrop-blur-xl border border-border shadow-xl rounded-xl p-5 max-w-[280px]">
        <div className="text-sm font-semibold text-foreground mb-3">Controls</div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs bg-muted px-2 py-1 rounded">↑↓←→</span>
            <span>Move character</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs bg-muted px-2 py-1 rounded">🖱️</span>
            <span>Navigate camera</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs bg-muted px-2 py-1 rounded">💼</span>
            <span>Approach buildings</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default GameUI;
