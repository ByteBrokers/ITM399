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
    <div className="absolute bottom-1/2 left-1/2 transform -translate-x-1/2 bg-card backdrop-blur-xl border border-border shadow-2xl text-foreground p-6 rounded-2xl min-w-[360px] max-w-[400px] z-50">
      <div className="mb-4 pb-4 border-b border-border">
        <h3 className="text-2xl font-bold mb-2">{company.name}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{company.description}</p>
      </div>
      
      <div className="mb-1">
        <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Available Data</h4>
      </div>
      
      <div className="space-y-3">
        {company.interests.map((dataType) => {
          if (dataTypes[dataType]?.owned) {
            const price = Math.floor(dataTypes[dataType].value * company.multiplier);
            return (
              <Button
                key={dataType}
                onClick={() => onSell(dataType, price)}
                className="w-full h-auto py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base shadow-md hover:shadow-lg transition-all flex items-center justify-between group"
              >
                <span className="text-left">{dataType}</span>
                <span className="bg-primary-foreground/20 px-3 py-1 rounded-lg group-hover:bg-primary-foreground/30 transition-colors">
                  {price} coins
                </span>
              </Button>
            );
          }
          return (
            <div
              key={dataType}
              className="w-full py-4 px-4 bg-muted/50 text-muted-foreground rounded-lg border border-border flex items-center justify-between opacity-60"
            >
              <span className="text-left">{dataType}</span>
              <span className="text-sm">Not available</span>
            </div>
          );
        })}
      </div>
      
      <div className="mt-5 pt-4 border-t border-border text-center">
        <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
          <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse"></span>
          Walk away to close
        </p>
      </div>
    </div>
  );
};

export default InteractionPrompt;
