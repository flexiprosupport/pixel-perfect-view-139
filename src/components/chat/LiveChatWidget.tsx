import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  MessageCircle,
  Send,
  Loader2,
  User,
  Shield,
  Circle,
  Crown,
  Zap,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: 'user' | 'admin';
  message: string;
  is_read: boolean;
  created_at: string;
}

interface ChatConversation {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  status: 'open' | 'closed';
  last_message_at: string;
  created_at: string;
}

// Format chat messages with proper styling - MONOCHROME DESIGN
function ChatMessageContent({ message, isAdmin }: { message: string; isAdmin: boolean }) {
  // Check if this is a subscription request or approval/rejection message
  const isSubscriptionRequest = message.includes('SUBSCRIPTION REQUEST');
  const isApproval = message.includes('SUBSCRIPTION APPROVED');
  const isRejection = message.includes('SUBSCRIPTION REQUEST DECLINED') || message.includes('REQUEST DECLINED');

  // Clean up markdown and extra whitespace
  const cleanMessage = message
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1');

  // For subscription-related messages, format nicely with card style
  if (isSubscriptionRequest || isApproval || isRejection) {
    // Parse fields - handle emoji prefixes with flexible matching
    const planMatch = cleanMessage.match(/(?:🎯\s*)?Plan:\s*(.+?)(?:\n|$)/);
    const nameMatch = cleanMessage.match(/(?:👤\s*)?Name:\s*(.+?)(?:\n|$)/);
    const emailMatch = cleanMessage.match(/(?:📧\s*)?Email:\s*(.+?)(?:\n|$)/);
    const phoneMatch = cleanMessage.match(/(?:📞\s*)?Phone:\s*(.+?)(?:\n|$)/);
    const requestIdMatch = cleanMessage.match(/Request ID:\s*(.+?)(?:\n|$)/);
    const expiresMatch = cleanMessage.match(/(?:📅\s*)?Expires:\s*(.+?)(?:\n|$)/);
    const userMessageMatch = cleanMessage.match(/(?:💬\s*)?Message:\s*(.+?)(?:\n|---|$)/s);

    const headerIcon = isApproval ? (
      <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center shadow-lg">
        <Zap className="h-5 w-5 text-background" />
      </div>
    ) : isRejection ? (
      <div className="w-10 h-10 rounded-xl bg-muted-foreground flex items-center justify-center shadow-lg">
        <Circle className="h-5 w-5 text-background" />
      </div>
    ) : (
      <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center shadow-lg">
        <Crown className="h-5 w-5 text-background" />
      </div>
    );

    const headerText = isApproval
      ? 'Subscription Approved!'
      : isRejection
        ? 'Request Declined'
        : 'Subscription Request';

    return (
      <div className="rounded-xl overflow-hidden border border-border bg-card shadow-lg">
        {/* Header - Monochrome */}
        <div className="flex items-center gap-3 px-4 py-3 bg-muted/50 border-b border-border">
          {headerIcon}
          <span className="font-bold text-base text-foreground">{headerText}</span>
        </div>

        {/* Content */}
        <div className="px-4 py-4 space-y-2">
          {planMatch && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/80">
              <div className="w-8 h-8 rounded-lg bg-foreground/10 flex items-center justify-center">
                <Crown className="h-4 w-4 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Plan</span>
                <p className="text-sm font-semibold text-foreground truncate">{planMatch[1].trim()}</p>
              </div>
            </div>
          )}

          {nameMatch && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/80">
              <div className="w-8 h-8 rounded-lg bg-foreground/10 flex items-center justify-center">
                <User className="h-4 w-4 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Name</span>
                <p className="text-sm font-semibold text-foreground truncate">{nameMatch[1].trim()}</p>
              </div>
            </div>
          )}

          {emailMatch && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/80">
              <div className="w-8 h-8 rounded-lg bg-foreground/10 flex items-center justify-center">
                <Shield className="h-4 w-4 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Email</span>
                <p className="text-sm font-semibold text-foreground truncate">{emailMatch[1].trim()}</p>
              </div>
            </div>
          )}

          {phoneMatch && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/80">
              <div className="w-8 h-8 rounded-lg bg-foreground/10 flex items-center justify-center">
                <MessageCircle className="h-4 w-4 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Phone</span>
                <p className="text-sm font-semibold text-foreground truncate">{phoneMatch[1].trim()}</p>
              </div>
            </div>
          )}

          {expiresMatch && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/80">
              <div className="w-8 h-8 rounded-lg bg-foreground/10 flex items-center justify-center">
                <Circle className="h-4 w-4 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Expires</span>
                <p className="text-sm font-semibold text-foreground truncate">{expiresMatch[1].trim()}</p>
              </div>
            </div>
          )}

          {userMessageMatch && userMessageMatch[1].trim() && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/80">
              <div className="w-8 h-8 rounded-lg bg-foreground/10 flex items-center justify-center shrink-0">
                <MessageCircle className="h-4 w-4 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Message</span>
                <p className="text-sm text-foreground/80">{userMessageMatch[1].trim()}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Request ID */}
        {requestIdMatch && (
          <div className="px-4 py-2.5 border-t border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Request ID:</span>
              <code className="text-[10px] px-2 py-0.5 rounded bg-foreground/10 text-muted-foreground font-mono">
                {requestIdMatch[1].trim().slice(0, 8)}...
              </code>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Regular messages - just clean up markdown
  return <p className="text-sm whitespace-pre-wrap break-words">{cleanMessage}</p>;
}

export function LiveChatWidget() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get or create conversation — NEVER filter by status so chat history is ALWAYS preserved
  const { data: conversation, isLoading: loadingConversation } = useQuery({
    queryKey: ['user-chat-conversation', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Get MOST RECENT conversation regardless of status (never lose history)
      const { data: existing, error: fetchError } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (existing) return existing as ChatConversation;

      // Only create new conversation if NONE exists at all
      const { data: newConv, error: createError } = await supabase
        .from('chat_conversations')
        .insert({
          user_id: user.id,
          user_email: profile?.email || user.email || '',
          user_name: profile?.full_name || null,
          status: 'open',
        })
        .select()
        .single();

      if (createError) throw createError;
      return newConv as ChatConversation;
    },
    enabled: !!user && isOpen,
  });

  // Fetch messages
  const { data: messages } = useQuery({
    queryKey: ['chat-messages', conversation?.id],
    queryFn: async () => {
      if (!conversation) return [];

      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ChatMessage[];
    },
    enabled: !!conversation,
    refetchOnWindowFocus: false,
  });

  // Subscribe to realtime messages
  useEffect(() => {
    if (!conversation) return;

    const channel = supabase
      .channel(`chat-${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chat-messages', conversation.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation?.id, queryClient]);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!user || !conversation) throw new Error('Not ready');

      const { error } = await supabase.from('chat_messages').insert({
        conversation_id: conversation.id,
        sender_id: user.id,
        sender_role: 'user',
        message: text.trim(),
      });

      if (error) throw error;
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['chat-messages', conversation?.id] });
    },
    onError: () => {
      toast.error('Failed to send message');
    },
  });

  const handleSend = () => {
    if (!message.trim()) return;
    sendMessageMutation.mutate(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Count unread admin messages
  const unreadCount = messages?.filter(m => m.sender_role === 'admin' && !m.is_read).length || 0;

  if (!user) return null;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          data-live-chat-trigger
          className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 h-14 w-14 rounded-full shadow-2xl bg-primary hover:bg-primary/90 z-50"
        >
          <MessageCircle className="h-6 w-6" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-destructive text-[10px]">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-border bg-muted/50">
          <SheetTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageCircle className="h-4 w-4 text-primary" />
            </div>
            Live Chat Support
            <Circle className="h-2 w-2 fill-success text-success ml-auto" />
          </SheetTitle>
        </SheetHeader>

        {/* Messages Area */}
        <ScrollArea ref={scrollRef} className="flex-1 p-4">
          {loadingConversation ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Welcome message */}
              {(!messages || messages.length === 0) && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">Welcome to Live Chat!</h3>
                  <p className="text-sm text-muted-foreground">
                    Send a message and our team will respond shortly.
                  </p>
                </div>
              )}

              {messages?.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex gap-2',
                    msg.sender_role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {msg.sender_role === 'admin' && (
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <Shield className="h-3.5 w-3.5 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-4 py-2.5',
                      msg.sender_role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted rounded-bl-md'
                    )}
                  >
                    <ChatMessageContent message={msg.message} isAdmin={msg.sender_role === 'admin'} />
                    <p
                      className={cn(
                        'text-[10px] mt-1',
                        msg.sender_role === 'user'
                          ? 'text-primary-foreground/70'
                          : 'text-muted-foreground'
                      )}
                    >
                      {format(new Date(msg.created_at), 'h:mm a')}
                    </p>
                  </div>
                  {msg.sender_role === 'user' && (
                    <div className="w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center shrink-0">
                      <User className="h-3.5 w-3.5 text-foreground" />
                    </div>
                  )}
                </div>
              ))}

              {sendMessageMutation.isPending && (
                <div className="flex justify-end gap-2">
                  <div className="bg-primary/50 rounded-2xl rounded-br-md px-4 py-2.5">
                    <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t border-border bg-background">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sendMessageMutation.isPending || !conversation}
              className="rounded-full"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!message.trim() || sendMessageMutation.isPending || !conversation}
              className="rounded-full shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
