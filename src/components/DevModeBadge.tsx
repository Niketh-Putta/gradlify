import { Badge } from "@/components/ui/badge";

export function DevModeBadge() {
  const isDev = import.meta.env.VITE_DEV_MODE === 'true';
  
  if (!isDev) return null;
  
  return (
    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">
      Dev Mode
    </Badge>
  );
}