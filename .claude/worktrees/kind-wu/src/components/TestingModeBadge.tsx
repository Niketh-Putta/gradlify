import { Badge } from "@/components/ui/badge";

export function TestingModeBadge() {
  const isTestingMode = import.meta.env.VITE_TESTING_MODE === 'true';
  
  if (!isTestingMode) return null;
  
  return (
    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300 text-xs">
      Testing Mode
    </Badge>
  );
}