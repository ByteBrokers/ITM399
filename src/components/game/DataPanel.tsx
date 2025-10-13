import type { DataType } from "@/types/game";

interface DataPanelProps {
  dataTypes: Record<string, DataType>;
}

const DataPanel = ({ dataTypes }: DataPanelProps) => {
  return (
    <div className="absolute top-5 right-5 bg-black/80 backdrop-blur-lg text-white p-4 rounded-lg min-w-[200px]">
      <h4 className="font-bold mb-3">📊 Your Data Store</h4>
      <div className="space-y-2">
        {Object.entries(dataTypes).map(([type, data]) => (
          <div
            key={type}
            className={`p-2 rounded bg-white/10 ${!data.owned ? 'opacity-50' : ''}`}
          >
            <div className="text-sm">{type}</div>
            <div className="font-bold text-accent">
              {data.value} {data.owned ? '' : '(Sold)'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DataPanel;
