import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Dna, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import { MistakeGene } from '@/lib/mindprint/useMistakeGenome';

interface MistakeGenomeCardProps {
  genes: MistakeGene[];
  loading: boolean;
  onFixIt: (gene: MistakeGene) => void;
}

export function MistakeGenomeCard({ genes, loading, onFixIt }: MistakeGenomeCardProps) {
  if (loading) {
    return (
      <Card className="rounded-2xl">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getGeneColor = (index: number) => {
    const colors = ['from-red-500/20 to-orange-500/20', 'from-orange-500/20 to-yellow-500/20', 'from-yellow-500/20 to-green-500/20'];
    return colors[index] || colors[0];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <Card className="rounded-2xl bg-gradient-to-br from-background via-background to-muted/20 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Dna className="h-5 w-5 text-orange-500" />
            Mistake Genome
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {genes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Dna className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No error patterns detected yet</p>
              <p className="text-sm mt-1">Complete more practice to see insights</p>
            </div>
          ) : (
            <TooltipProvider>
              {genes.map((gene, index) => (
                <motion.div
                  key={gene.type}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className={`p-4 rounded-xl bg-gradient-to-r ${getGeneColor(index)} border border-border/30`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-foreground capitalize">{gene.type.replace(/_/g, ' ')}</h4>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="secondary" className="cursor-help">
                              {gene.frequencyPct}%
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs text-sm">{gene.example}</p>
                          </TooltipContent>
                        </Tooltip>
                        {getTrendIcon(gene.trend)}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {gene.example}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onFixIt(gene)}
                      className="shrink-0"
                    >
                      Fix it
                    </Button>
                  </div>
                </motion.div>
              ))}
            </TooltipProvider>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
