import { Button } from "@/components/ui/button";
import type { Company, DataType } from "@/types/game";

interface InteractionPromptProps {
  company: Company;
  dataTypes: Record<string, DataType>;
  onSell: (dataType: string, price: number) => void;
  onClose: () => void;
}

const InteractionPrompt = ({ company, dataTypes, onSell, onClose }: InteractionPromptProps) => {
  return (
    <div className="absolute bottom-1/2 left-1/2 transform -translate-x-1/2 bg-card backdrop-blur-xl border border-border shadow-xl text-foreground p-4 rounded-xl min-w-[280px] max-w-[320px] z-50">
      <div className="mb-3 pb-3 border-b border-border">
        <h3 className="text-lg font-bold mb-1">{company.name}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{company.description}</p>
      </div>
      
      <div className="mb-1">
        <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Available Data</h4>
      </div>
      
      <div className="space-y-2">
        {company.interests.map((dataType) => {
          if (dataTypes[dataType]?.owned) {
            const price = Math.floor(dataTypes[dataType].value * company.multiplier);
            return (
              <Button
                key={dataType}
                onClick={() => onSell(dataType, price)}
                size="sm"
                className="w-full h-auto py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-between group"
              >
                <span className="text-left text-xs">{dataType}</span>
                <span className="bg-primary-foreground/20 px-2 py-0.5 rounded text-xs group-hover:bg-primary-foreground/30 transition-colors">
                  {price}
                </span>
              </Button>
            );
          }
          return (
            <div
              key={dataType}
              className="w-full py-2 px-3 bg-muted/50 text-muted-foreground rounded text-xs border border-border flex items-center justify-between opacity-60"
            >
              <span className="text-left">{dataType}</span>
              <span className="text-xs">Not available</span>
            </div>
          );
        })}
      </div>
      
      <div className="mt-3 pt-3 border-t border-border text-center">
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
          Walk away to close
        </p>
      </div>
    </div>
  );
};

export default InteractionPrompt;
