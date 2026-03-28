import { Badge } from "@/components/ui/badge";
import { useTestingMode } from "@/hooks/useTestingMode";

export function TestingBanner() {
  const { isTestingMode } = useTestingMode();
  
  if (!isTestingMode) return null;
  
  return (
    <div className="w-full bg-yellow-50 px-4 py-2 text-center rounded-b-3xl">
      <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300 rounded-full">
        Testing mode: unlimited usage
      </Badge>
    </div>
  );
}