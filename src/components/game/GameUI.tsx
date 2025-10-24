import { Button } from "@/components/ui/button";
import type { GameStateData } from "@/types/game";
import { BarChart3, UserPen, LogOut, Wallet, Home, FileText } from "lucide-react";

interface GameUIProps {
  gameState: GameStateData;
  onLogout: () => void;
  onEditCharacter: () => void;
  onOpenDashboard: () => void;
  onOpenWithdraw: () => void;
  onGoHome: () => void;
  onUpdateInfo: () => void;
}

const GameUI = ({ gameState, onLogout, onEditCharacter, onOpenDashboard, onOpenWithdraw, onGoHome, onUpdateInfo }: GameUIProps) => {
  return (
    <>
      <div className="absolute top-4 left-4 bg-card/95 backdrop-blur-xl border border-border shadow-xl rounded-2xl p-4 min-w-[200px]">
        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border">
          <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-lg">
            💰
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Balance</div>
            <div className="text-xl font-bold text-foreground">{gameState.coins}</div>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs mb-3 pb-3 border-b border-border">
          <div className="text-center">
            <div className="text-muted-foreground mb-1">Level</div>
            <div className="text-sm font-semibold text-foreground">{gameState.level}</div>
          </div>
          <div className="h-6 w-px bg-border"></div>
          <div className="text-center">
            <div className="text-muted-foreground mb-1">XP</div>
            <div className="text-sm font-semibold text-foreground">{gameState.exp}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-1.5">
          <Button 
            onClick={onGoHome} 
            variant="outline" 
            size="icon"
            className="h-9 w-full"
            title="Home"
          >
            <Home className="h-4 w-4" />
          </Button>
          <Button 
            onClick={onOpenDashboard} 
            variant="outline" 
            size="icon"
            className="h-9 w-full"
            title="Dashboard"
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
          <Button 
            onClick={onEditCharacter} 
            variant="outline" 
            size="icon"
            className="h-9 w-full"
            title="Edit Character"
          >
            <UserPen className="h-4 w-4" />
          </Button>
          <Button 
            onClick={onUpdateInfo}
            variant="outline" 
            size="icon"
            className="h-9 w-full"
            title="Update Information"
          >
            <FileText className="h-4 w-4" />
          </Button>
          <Button 
            onClick={onOpenWithdraw}
            variant="outline" 
            size="icon"
            className="h-9 w-full"
            title="Withdraw"
          >
            <Wallet className="h-4 w-4" />
          </Button>
          <Button 
            onClick={onLogout} 
            variant="destructive" 
            size="icon"
            className="h-9 w-full"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 bg-card/95 backdrop-blur-xl border border-border shadow-xl rounded-xl p-3 max-w-[220px]">
        <div className="text-xs font-semibold text-foreground mb-2">Controls</div>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">↑↓←→</span>
            <span>Move</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">💼</span>
            <span>Approach buildings</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default GameUI;
