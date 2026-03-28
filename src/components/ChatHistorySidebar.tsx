import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ChatHistorySidebarProps {
  userId: string;
  currentSessionId?: string;
  onSessionSelect: (sessionId: string) => void;
  onNewChat: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function ChatHistorySidebar({
  userId,
  currentSessionId,
  onSessionSelect,
  onNewChat,
  collapsed = false,
  onToggleCollapse
}: ChatHistorySidebarProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error('Failed to load chat history');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions]);

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await supabase
        .from('chat_messages')
        .delete()
        .eq('chat_session_id', sessionId);

      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      setSessions(prev => prev.filter(s => s.id !== sessionId));
      
      if (currentSessionId === sessionId) {
        onNewChat();
      }
      
      toast.success('Chat deleted');
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete chat');
    }
  };

  const handleNewChat = () => {
    fetchSessions();
    onNewChat();
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffHours < 1) return 'now';
    if (diffHours < 24) return `${Math.floor(diffHours)}h`;
    return `${Math.floor(diffDays)}d`;
  };

  if (collapsed) return null;

  return (
    <aside className="w-60 h-full flex flex-col bg-[hsl(var(--chat-bg-secondary))]">
      {/* Logo */}
      <div className="px-6 pt-8 pb-14">
        <h1 className="text-[17px] font-semibold tracking-tight">
          <span className="bg-gradient-to-r from-[hsl(var(--chat-accent))] to-purple-500 bg-clip-text text-transparent">
            Gradlify
          </span>
        </h1>
      </div>

      {/* Recent Chats Section */}
      <div className="flex-1 px-6 overflow-y-auto scrollbar-hide">
        <div className="text-[11px] font-medium tracking-wider text-[hsl(var(--chat-text-tertiary))] uppercase mb-5">
          Recent Chats
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-[hsl(var(--chat-bg-tertiary))] rounded animate-pulse" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-[13px] text-[hsl(var(--chat-text-tertiary))]">No chats yet</p>
        ) : (
          <div className="flex flex-col gap-1">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => onSessionSelect(session.id)}
                className={`group flex items-center justify-between gap-2.5 px-3 py-2.5 text-[13px] rounded-lg cursor-pointer transition-all duration-200 w-full text-left ${
                  currentSessionId === session.id
                    ? 'bg-[hsl(var(--chat-bg-tertiary))] text-[hsl(var(--chat-text-primary))]'
                    : 'text-[hsl(var(--chat-text-secondary))] hover:text-[hsl(var(--chat-text-primary))] hover:bg-[hsl(var(--chat-bg-tertiary))]'
                }`}
              >
                <span className="flex-1 truncate font-normal leading-snug">
                  {session.title}
                </span>
                <span className="text-[11px] text-[hsl(var(--chat-text-tertiary))] flex-shrink-0 group-hover:hidden">
                  {formatTime(session.updated_at)}
                </span>
                <button
                  onClick={(e) => deleteSession(session.id, e)}
                  className="hidden group-hover:flex p-1 hover:bg-destructive/10 rounded transition-colors flex-shrink-0"
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </button>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* New Chat Button */}
      <div className="p-6">
        <button
          onClick={handleNewChat}
          className="w-full py-3 px-4 text-[13px] font-medium text-[hsl(var(--chat-accent))] bg-[hsl(var(--chat-accent-soft))] border-none rounded-xl cursor-pointer transition-all duration-200 hover:bg-[hsl(var(--chat-accent))] hover:text-white"
        >
          New chat
        </button>
      </div>
    </aside>
  );
}
