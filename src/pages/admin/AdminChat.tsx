import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MessageCircle,
  Send,
  Loader2,
  ArrowLeft,
  User,
  Shield,
  Circle,
  Mail,
  CheckCheck,
  Crown,
  Zap,
} from 'lucide-react';
import { Link, Navigate } from "@/lib/router-compat";
import { format, formatDistanceToNow } from 'date-fns';
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

// Component to render message content with proper formatting
function MessageContent({ message, isSubscriptionRequest }: { message: string; isSubscriptionRequest: boolean }) {
  // For subscription requests, format them nicely
  if (isSubscriptionRequest) {
    // Remove the header line as we show it separately
    const lines = message.split('\n').filter(line => 
      !line.includes('📋 SUBSCRIPTION REQUEST') && 
      !line.includes('📋 **SUBSCRIPTION REQUEST**')
    );
    
    return (
      <div className="text-sm space-y-1">
        {lines.map((line, index) => {
          // Skip empty lines
          if (!line.trim()) return null;
          // Skip separator
          if (line.trim() === '---') return <div key={index} className="border-t border-border/50 my-2" />;
          
          // Format field lines (with emojis)
          const cleaned = line
            .replace(/\*\*/g, '') // Remove **
            .replace(/\*/g, ''); // Remove *
          
          // Match lines with emoji and label
          const fieldMatch = cleaned.match(/^([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}])\s*(.+?):\s*(.*)$/u);
          if (fieldMatch) {
            const [, emoji, label, value] = fieldMatch;
            return (
              <div key={index} className="flex items-start gap-2">
                <span>{emoji}</span>
                <span className="font-semibold text-foreground/70">{label}:</span>
                <span className="text-foreground">{value}</span>
              </div>
            );
          }
          
          // Check if it's the Request ID line
          if (cleaned.includes('Request ID:')) {
            const idMatch = cleaned.match(/Request ID:\s*(.+)/);
            if (idMatch) {
              return (
                <div key={index} className="mt-2 pt-2 text-xs text-muted-foreground">
                  Request ID: <code className="bg-muted px-1 py-0.5 rounded text-[10px]">{idMatch[1]}</code>
                </div>
              );
            }
          }
          
          // Default - show as regular text
          return <p key={index} className="text-muted-foreground text-xs">{cleaned}</p>;
        })}
      </div>
    );
  }
  
  // For regular messages, just show with proper line breaks
  // Also clean up any ** markdown that might be in older messages
  const cleanedMessage = message
    .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold markdown
    .replace(/\*(.+?)\*/g, '$1'); // Remove italic markdown
  
  return <p className="text-sm whitespace-pre-wrap break-words">{cleanedMessage}</p>;
}

export default function AdminChat() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [message, setMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch all conversations
  const { data: conversations, isLoading: loadingConversations } = useQuery({
    queryKey: ['admin-chat-conversations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      return data as ChatConversation[];
    },
    refetchInterval: 60000,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  // Fetch messages for selected conversation
  const { data: messages } = useQuery({
    queryKey: ['admin-chat-messages', selectedConversation?.id],
    queryFn: async () => {
      if (!selectedConversation) return [];

      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', selectedConversation.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Mark messages as read
      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('conversation_id', selectedConversation.id)
        .eq('sender_role', 'user')
        .eq('is_read', false);

      return data as ChatMessage[];
    },
    enabled: !!selectedConversation,
    // Realtime channel below pushes new messages instantly; this is only a fallback.
    refetchInterval: 60000,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  // Subscribe to realtime for new messages
  useEffect(() => {
    const channel = supabase
      .channel('admin-chat-all')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-chat-conversations'] });
          if (selectedConversation) {
            queryClient.invalidateQueries({ queryKey: ['admin-chat-messages', selectedConversation.id] });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_conversations',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-chat-conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, selectedConversation]);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!user || !selectedConversation) throw new Error('Not ready');

      const { error } = await supabase.from('chat_messages').insert({
        conversation_id: selectedConversation.id,
        sender_id: user.id,
        sender_role: 'admin',
        message: text.trim(),
      });

      if (error) throw error;
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['admin-chat-messages', selectedConversation?.id] });
      queryClient.invalidateQueries({ queryKey: ['admin-chat-conversations'] });
    },
    onError: () => {
      toast.error('Failed to send message');
    },
  });

  // Chat conversations remain open permanently - no close functionality

  // Note: Subscription approve/reject is handled from Admin Subscriptions page, not from chat

  // Helper to parse subscription request from message
  const parseSubscriptionRequest = (message: string) => {
    // Support both old format with ** and new clean format
    if (!message.includes('📋 SUBSCRIPTION REQUEST') && !message.includes('📋 **SUBSCRIPTION REQUEST**')) return null;
    
    // Match both formats: "**Plan:**" or "Plan:"
    const planMatch = message.match(/(?:\*\*)?Plan:(?:\*\*)?\s*(Monthly|Lifetime)/i);
    // Match full UUID format (36 chars with dashes)
    const requestIdMatch = message.match(/Request ID:\s*([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
    
    if (!planMatch || !requestIdMatch) return null;
    
    return {
      planType: planMatch[1].toLowerCase(),
      requestId: requestIdMatch[1],
    };
  };

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

  // Get unread count for a conversation
  const getUnreadCount = (convId: string) => {
    // This would need a separate query or be included in conversations fetch
    return 0; // Placeholder
  };

  // All conversations are shown - no closed filter needed anymore
  const allConversations = conversations || [];

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <Link
            to="/admin"
            className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Live Chat</h1>
            <p className="text-sm text-muted-foreground">
              {allConversations.length} conversation{allConversations.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
          {/* Conversations List */}
          <Card className="glass-card lg:col-span-1 flex flex-col min-h-0">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Conversations
              </h2>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {loadingConversations ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : allConversations.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No conversations yet</p>
                  </div>
                ) : (
                  <>
                    {/* All conversations */}
                    {allConversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => setSelectedConversation(conv)}
                        className={cn(
                          'w-full p-3 rounded-xl text-left transition-all',
                          selectedConversation?.id === conv.id
                            ? 'bg-primary/10 border border-primary/30'
                            : 'hover:bg-muted'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium truncate text-sm">
                                {conv.user_name || conv.user_email.split('@')[0]}
                              </p>
                              <Circle className="h-2 w-2 fill-success text-success shrink-0" />
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {conv.user_email}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </ScrollArea>
          </Card>

          {/* Chat Panel */}
          <Card className="glass-card lg:col-span-2 flex flex-col min-h-0">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">
                        {selectedConversation.user_name || selectedConversation.user_email.split('@')[0]}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {selectedConversation.user_email}
                      </p>
                    </div>
                  </div>
                  <Badge variant="default" className="bg-success/20 text-success border-success/30">
                    Active
                  </Badge>
                </div>

                {/* Messages */}
                <ScrollArea ref={scrollRef} className="flex-1 p-4">
                  <div className="space-y-3">
                    {messages?.map((msg) => {
                      const subscriptionRequest = msg.sender_role === 'user' ? parseSubscriptionRequest(msg.message) : null;
                      
                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            'flex gap-2',
                            msg.sender_role === 'admin' ? 'justify-end' : 'justify-start'
                          )}
                        >
                          {msg.sender_role === 'user' && (
                            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="max-w-[80%]">
                            <div
                              className={cn(
                                'rounded-2xl px-4 py-2.5',
                                msg.sender_role === 'admin'
                                  ? 'bg-primary text-primary-foreground rounded-br-md'
                                  : subscriptionRequest 
                                    ? 'bg-gradient-to-br from-warning/20 to-primary/20 border border-warning/30 rounded-bl-md'
                                    : 'bg-muted rounded-bl-md'
                              )}
                            >
                              {subscriptionRequest && (
                                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-warning/30">
                                  {subscriptionRequest.planType === 'lifetime' ? (
                                    <Crown className="h-4 w-4 text-warning" />
                                  ) : (
                                    <Zap className="h-4 w-4 text-primary" />
                                  )}
                                  <span className="text-xs font-bold uppercase tracking-wide">
                                    Subscription Request
                                  </span>
                                </div>
                              )}
                              <MessageContent message={msg.message} isSubscriptionRequest={!!subscriptionRequest} />
                              <div
                                className={cn(
                                  'flex items-center gap-1 mt-1',
                                  msg.sender_role === 'admin'
                                    ? 'text-primary-foreground/70 justify-end'
                                    : 'text-muted-foreground'
                                )}
                              >
                                <span className="text-[10px]">
                                  {format(new Date(msg.created_at), 'h:mm a')}
                                </span>
                                {msg.sender_role === 'admin' && msg.is_read && (
                                  <CheckCheck className="h-3 w-3" />
                                )}
                              </div>
                            </div>
                            
                            {/* Note: Approve/Reject is done from Admin Subscriptions page */}
                          </div>
                          {msg.sender_role === 'admin' && (
                            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                              <Shield className="h-3.5 w-3.5 text-primary" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>

                {/* Input - Always visible since chats are permanent */}
                <div className="p-4 border-t border-border">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type your reply..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={sendMessageMutation.isPending}
                      className="rounded-full"
                    />
                    <Button
                      onClick={handleSend}
                      disabled={!message.trim() || sendMessageMutation.isPending}
                      className="rounded-full shrink-0"
                    >
                      {sendMessageMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-1">Select a Conversation</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose a conversation from the list to start chatting
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
