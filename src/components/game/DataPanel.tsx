import type { DataType } from "@/types/game";

interface DataPanelProps {
  dataTypes: Record<string, DataType>;
}

const DataPanel = ({ dataTypes }: DataPanelProps) => {
  return (
    <div className="absolute top-6 right-6 bg-card/90 backdrop-blur-xl border border-border shadow-xl rounded-xl p-5 min-w-[260px]">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center text-lg">
          📊
        </div>
        <h4 className="font-semibold text-foreground">Data Inventory</h4>
      </div>
      <div className="space-y-2">
        {Object.entries(dataTypes).map(([type, data]) => (
          <div
            key={type}
            className={`p-3 rounded-lg border transition-all ${
              data.owned 
                ? 'bg-gradient-overlay border-primary/20' 
                : 'bg-muted/50 border-border opacity-60'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-foreground">{type}</span>
              <span className="text-xs font-semibold text-primary">{data.value}</span>
            </div>
            {!data.owned && (
              <div className="text-xs text-muted-foreground mt-1">Collecting...</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DataPanel;
