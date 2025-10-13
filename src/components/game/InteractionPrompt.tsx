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
    <div className="absolute bottom-1/2 left-1/2 transform -translate-x-1/2 bg-black/90 backdrop-blur-lg text-white p-6 rounded-xl min-w-[300px]">
      <button onClick={onClose} className="absolute top-2 right-2 text-destructive hover:text-destructive/80">
        ×
      </button>
      <h3 className="text-xl font-bold mb-2">{company.name}</h3>
      <p className="text-sm text-muted-foreground mb-4">{company.description}</p>
      <div className="space-y-2">
        {company.interests.map((dataType) => {
          if (dataTypes[dataType]?.owned) {
            const price = Math.floor(dataTypes[dataType].value * company.multiplier);
            return (
              <Button
                key={dataType}
                onClick={() => onSell(dataType, price)}
                className="w-full bg-gradient-success"
              >
                Sell {dataType} for {price} coins
              </Button>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
};

export default InteractionPrompt;
