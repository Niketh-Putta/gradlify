import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Trash2, ArrowLeft, Database } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { useNavigate } from 'react-router-dom';

interface DebugStats {
  userId: string;
  topicCatalogCount: number;
  subtopicProgressCount: number;
  recentProgress: Array<{
    topic_key: string;
    subtopic_key: string;
    score: number;
    updated_at: string;
  }>;
}

export default function Debug() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DebugStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [rebuilding, setRebuilding] = useState(false);

  const loadDebugData = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to view debug data');
        navigate('/');
        return;
      }

      const userId = session.user.id;

      // Get topic catalog count
      const { count: catalogCount } = await supabase
        .from('topic_catalog')
        .select('*', { count: 'exact', head: true });

      // Get user's subtopic progress count
      const { count: progressCount } = await supabase
        .from('subtopic_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Get recent progress records
      const { data: recentProgress } = await supabase
        .from('subtopic_progress')
        .select('topic_key, subtopic_key, score, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(10);

      setStats({
        userId,
        topicCatalogCount: catalogCount || 0,
        subtopicProgressCount: progressCount || 0,
        recentProgress: recentProgress || []
      });

    } catch (error) {
      console.error('Error loading debug data:', error);
      toast.error('Failed to load debug data');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    void loadDebugData();
  }, [loadDebugData]);

  const forceRebuild = async () => {
    try {
      setRebuilding(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to rebuild data');
        return;
      }

      // Delete all user's progress
      const { error: deleteError } = await supabase
        .from('subtopic_progress')
        .delete()
        .eq('user_id', session.user.id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      toast.success('Progress data cleared. Redirecting to dashboard...');
      
      // Redirect to dashboard to trigger reseeding
      setTimeout(() => {
        navigate('/');
      }, 1000);

    } catch (error) {
      console.error('Error rebuilding:', error);
      const message = error instanceof Error ? error.message : 'Failed to rebuild';
      toast.error(message);
    } finally {
      setRebuilding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/50 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="bg-gradient-card border-0 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-accent animate-spin" />
                Loading Debug Data...
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground">
                Fetching progress statistics...
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-accent" />
                  Debug Panel
                </CardTitle>
                <CardDescription>
                  Progress data diagnostics and troubleshooting
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={loadDebugData} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button variant="outline" onClick={() => navigate('/')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Stats Overview */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="bg-gradient-card border-0 shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">User ID</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-accent mb-2">
                  {stats.userId.slice(0, 8)}...
                </div>
                <p className="text-xs text-muted-foreground font-mono break-all">
                  {stats.userId}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-0 shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Topic Catalog</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-accent mb-2">
                  {stats.topicCatalogCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total subtopics available
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-0 shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Your Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-accent mb-2">
                  {stats.subtopicProgressCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  Subtopics with progress data
                </p>
                {stats.subtopicProgressCount < stats.topicCatalogCount && (
                  <Badge variant="destructive" className="mt-2 text-xs">
                    Missing {stats.topicCatalogCount - stats.subtopicProgressCount} records
                  </Badge>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Progress */}
        {stats && stats.recentProgress.length > 0 && (
          <Card className="bg-gradient-card border-0 shadow-card">
            <CardHeader>
              <CardTitle>Recent Progress Updates</CardTitle>
              <CardDescription>
                Last 10 subtopic updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.recentProgress.map((item, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-medium text-sm">
                          {item.topic_key}.{item.subtopic_key}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(item.updated_at).toLocaleString()}
                        </div>
                      </div>
                      <Badge variant={item.score >= 70 ? 'default' : item.score >= 40 ? 'outline' : 'destructive'}>
                        {item.score}%
                      </Badge>
                    </div>
                    {index < stats.recentProgress.length - 1 && <Separator className="mt-3" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              These actions will permanently delete your progress data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="destructive" 
              onClick={forceRebuild}
              disabled={rebuilding}
              className="w-full sm:w-auto"
            >
              <Trash2 className={`h-4 w-4 mr-2 ${rebuilding ? 'animate-spin' : ''}`} />
              {rebuilding ? 'Rebuilding...' : 'Force Rebuild (Clear All Progress)'}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              This will delete all your progress and re-seed from scratch
            </p>
          </CardContent>
        </Card>

        {/* Warning for no data */}
        {stats && stats.subtopicProgressCount === 0 && (
          <Card className="bg-gradient-card border-0 shadow-card border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">No Progress Data Found</CardTitle>
              <CardDescription>
                You don't have any progress records. This should auto-seed when you visit the dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/')} className="w-full sm:w-auto">
                Go to Dashboard to Auto-Seed
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
