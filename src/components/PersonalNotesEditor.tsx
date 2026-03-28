import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { StickyNote, Save, Check } from "lucide-react";
import { toast } from "sonner";
import debounce from "lodash.debounce";

interface PersonalNotesEditorProps {
  topicSlug: string;
  userId: string | undefined;
}

export function PersonalNotesEditor({ topicSlug, userId }: PersonalNotesEditorProps) {
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch existing notes
  useEffect(() => {
    const fetchNotes = async () => {
      if (!userId || !topicSlug) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_topic_notes")
        .select("notes")
        .eq("user_id", userId)
        .eq("topic_slug", topicSlug)
        .maybeSingle();

      if (!error && data) {
        setNotes(data.notes || "");
      }
      setIsLoading(false);
    };

    fetchNotes();
  }, [userId, topicSlug]);

  // Auto-save function
  const saveNotes = useCallback(async (content: string) => {
    if (!userId || !topicSlug) return;

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("user_topic_notes")
        .upsert(
          {
            user_id: userId,
            topic_slug: topicSlug,
            notes: content,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,topic_slug" }
        );

      if (error) throw error;

      setLastSaved(new Date());
    } catch (error) {
      console.error("Error saving notes:", error);
      toast.error("Failed to save notes");
    } finally {
      setIsSaving(false);
    }
  }, [topicSlug, userId]);

  // Debounced save function
  const debouncedSave = useMemo(
    () =>
      debounce((content: string) => {
        void saveNotes(content);
      }, 1000),
    [saveNotes]
  );

  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  // Handle text change
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setNotes(newValue);
    debouncedSave(newValue);
  };

  if (!userId) {
    return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StickyNote className="h-5 w-5" />
            Personal Notes
          </CardTitle>
          <CardDescription>
            Sign in to save your personal notes for this topic
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <StickyNote className="h-5 w-5" />
              Personal Notes
            </CardTitle>
            <CardDescription>
              Add your own notes, examples, or reminders for this topic
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isSaving ? (
              <>
                <Save className="h-4 w-4 animate-pulse" />
                Saving...
              </>
            ) : lastSaved ? (
              <>
                <Check className="h-4 w-4 text-green-500" />
                Saved
              </>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Textarea
          value={notes}
          onChange={handleNotesChange}
          placeholder="Type your personal notes here... They will be saved automatically."
          className="min-h-[200px] resize-y"
          disabled={isLoading}
        />
        {lastSaved && (
          <p className="text-xs text-muted-foreground mt-2">
            Last saved: {lastSaved.toLocaleTimeString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
