import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  LifeBuoy, 
  Plus, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Send,
  HelpCircle,
  CreditCard,
  ShoppingCart,
  Bug,
  Settings,
  Crown,
  ChevronDown,
  Mail
} from "lucide-react";
import { PageMeta } from "@/components/seo/PageMeta";
import { format } from "date-fns";

const CATEGORIES = [
  { value: 'order', label: 'Order Issue', icon: ShoppingCart },
  { value: 'payment', label: 'Payment/Wallet', icon: CreditCard },
  { value: 'subscription', label: 'Subscription', icon: Crown },
  { value: 'technical', label: 'Technical Problem', icon: Bug },
  { value: 'account', label: 'Account Settings', icon: Settings },
  { value: 'other', label: 'Other', icon: HelpCircle },
];

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-blue-500' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  open: { label: 'Open', color: 'bg-blue-500', icon: MessageSquare },
  pending: { label: 'Pending', color: 'bg-yellow-500', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-orange-500', icon: Clock },
  resolved: { label: 'Resolved', color: 'bg-green-500', icon: CheckCircle },
  closed: { label: 'Closed', color: 'bg-muted', icon: CheckCircle },
};

const FAQ_ITEMS = [
  {
    question: "Do you need my social-media password?",
    answer: "No. FlexiPro only requires a supported public URL or username. Never send us a social-media password, OTP, recovery code or private crypto key."
  },
  {
    question: "Is engagement guaranteed to stay permanently?",
    answer: "No. Third-party platforms and users may remove or adjust engagement. A refill applies only when the service page expressly states a refill period."
  },
  {
    question: "Can FlexiPro guarantee my account will be safe?",
    answer: "No. Third-party platforms control enforcement. Review their rules before ordering and do not use FlexiPro to misrepresent influence or evade enforcement."
  },
  {
    question: "Can I cancel an order?",
    answer: "Only while the dashboard shows that cancellation is available. Processing or delivered work ordinarily cannot be reversed."
  },
  {
    question: "My payment was debited but my wallet was not credited. What now?",
    answer: "Open a payment ticket with the UPI transaction reference or crypto transaction hash. We trace it and credit or refund a verified failed or duplicate payment under the Refund Policy."
  },
  {
    question: "What if I used the wrong crypto network?",
    answer: "Contact support immediately. Recovery may be impossible. Never send a recovery fee unless support confirms in writing that recovery is technically possible and states the fee."
  },
  {
    question: "Why is my order delayed?",
    answer: "Common reasons include target privacy, URL changes, platform outages, order review, supplier capacity or overlapping orders. Submit the order ID if it passes the stated completion estimate."
  },
  {
    question: "Can I order for someone else?",
    answer: "Only if you are authorized by the account or content owner and the use is lawful and ethical."
  },
  {
    question: "Are purchased metrics organic?",
    answer: "No. Paid or arranged promotion should not be described as independent organic audience demand. See our Ethical Use Policy."
  },
  {
    question: "How do refunds work?",
    answer: "Confirmed non-delivery or partial delivery qualifies for re-delivery or wallet credit; verified duplicate or failed funding may be returned to the original method. See the Refund Policy."
  },
  {
    question: "Can I use FlexiPro for reviews or political content?",
    answer: "Not to create fake reviews, testimonials, political support, public opinion or other deceptive influence. See the Ethical Use Policy."
  },
  {
    question: "How do I delete my account or request my data?",
    answer: "Email flexipro.support@gmail.com from your registered email with the subject 'Privacy Request'. We may verify identity and retain limited records where law requires."
  },
];


export default function Support() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [showFAQ, setShowFAQ] = useState(false);
  
  
  // Form state
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('other');
  const [priority, setPriority] = useState('medium');

  // Fetch user's tickets
  const { data: tickets, isLoading } = useQuery({
    queryKey: ['support-tickets', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Create ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      if (!subject.trim()) throw new Error('Please enter a subject');
      if (!message.trim()) throw new Error('Please describe your issue');

      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          subject: subject.trim(),
          message: message.trim(),
          category,
          priority,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Ticket Created!",
        description: "Our support team will respond soon.",
      });
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSubject('');
    setMessage('');
    setCategory('other');
    setPriority('medium');
  };

  const openTickets = tickets?.filter(t => t.status !== 'closed' && t.status !== 'resolved') || [];
  const closedTickets = tickets?.filter(t => t.status === 'closed' || t.status === 'resolved') || [];

  return (
    <DashboardLayout>
      <PageMeta
        title="Support & FAQ — FlexiPro"
        description="FlexiPro support: open tickets, browse FAQs about delivery times, payments, refunds and Organic Mode. Typical first response within one business day."
        canonicalPath="/support"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Support', path: '/support' },
        ]}
        faqItems={FAQ_ITEMS.map((f) => ({ question: f.question, answer: f.answer }))}
      />
      <div className="space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl glass-card p-6 sm:p-8">
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20">
                  <LifeBuoy className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold">Support Center</h1>
                  <p className="text-sm text-muted-foreground">Get help with your orders and account</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <RefundClaimDialog />
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>

                  <Button className="gap-2 w-full sm:w-auto">
                    <Plus className="h-4 w-4" />
                    New Ticket
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create Support Ticket</DialogTitle>
                    <DialogDescription>
                      Describe your issue and we'll get back to you as soon as possible.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>
                              <div className="flex items-center gap-2">
                                <cat.icon className="h-4 w-4" />
                                {cat.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select value={priority} onValueChange={setPriority}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIORITIES.map(p => (
                            <SelectItem key={p.value} value={p.value}>
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${p.color}`} />
                                {p.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Input
                        placeholder="Brief description of your issue"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Message</Label>
                      <Textarea
                        placeholder="Please provide as much detail as possible..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={5}
                      />
                    </div>

                    <Button 
                      className="w-full gap-2" 
                      onClick={() => createTicketMutation.mutate()}
                      disabled={createTicketMutation.isPending}
                    >
                      {createTicketMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Submit Ticket
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              </div>

            </div>
          </div>
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl" />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl sm:text-3xl font-bold text-primary">{tickets?.length || 0}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Total Tickets</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl sm:text-3xl font-bold text-blue-500">{openTickets.length}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Open</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl sm:text-3xl font-bold text-green-500">{closedTickets.length}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Resolved</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl sm:text-3xl font-bold text-yellow-500">~2h</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Avg Response</p>
            </CardContent>
          </Card>
        </div>

        {/* Telegram Support */}
        <a
          href="https://t.me/BMG009"
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-xl p-4 sm:p-5 transition-transform hover:scale-[1.01]"
          style={{
            background: 'linear-gradient(135deg, #37BBFE, #007DBB)',
            boxShadow: '0 10px 28px rgba(34,158,217,.35)',
          }}
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,.2)', border: '2px solid #fff' }}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="#fff" aria-hidden="true">
                <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm sm:text-base">Need help? Chat on Telegram</p>
              <p className="text-white/85 text-xs sm:text-sm">Fastest response — join our support group for instant help</p>
            </div>
            <div className="hidden sm:block text-white text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,.2)' }}>
              Open →
            </div>
          </div>
        </a>

        {/* Email Support */}
        <a
          href="mailto:flexipro.support@gmail.com"
          className="block rounded-xl p-4 sm:p-5 transition-transform hover:scale-[1.01]"
          style={{
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            boxShadow: '0 10px 28px rgba(217,119,6,.35)',
          }}
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,.2)', border: '2px solid #fff' }}>
              <Mail className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm sm:text-base">Email Support</p>
              <p className="text-white/85 text-xs sm:text-sm">flexipro.support@gmail.com — we reply within 24 hours</p>
            </div>
            <div className="hidden sm:block text-white text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,.2)' }}>
              Mail →
            </div>
          </div>
        </a>

        {/* Tickets List */}

        <h2 className="sr-only">Your Support Tickets</h2>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Your Tickets
            </CardTitle>
            <CardDescription>View and track your support requests</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : tickets && tickets.length > 0 ? (
              <div className="space-y-3">
                {tickets.map((ticket) => {
                  const status = STATUS_CONFIG[(ticket.status ?? 'open') as string] || STATUS_CONFIG.open;
                  const StatusIcon = status.icon;
                  const categoryItem = CATEGORIES.find(c => c.value === ticket.category);
                  const CategoryIcon = categoryItem?.icon || HelpCircle;
                  const priorityItem = PRIORITIES.find(p => p.value === ticket.priority);

                  return (
                    <div
                      key={ticket.id}
                      className="p-4 rounded-xl border border-border bg-card/50 hover:bg-card/80 transition-colors cursor-pointer"
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                            <CategoryIcon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold truncate">{ticket.subject}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {ticket.message}
                            </p>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Badge variant="secondary" className={`${status.color} text-white text-xs`}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {status.label}
                              </Badge>
                              {priorityItem && (
                                <Badge variant="outline" className="text-xs gap-1">
                                  <span className={`w-1.5 h-1.5 rounded-full ${priorityItem.color}`} />
                                  {priorityItem.label}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground shrink-0">
                          {format(new Date(ticket.created_at as string), 'MMM d, h:mm a')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <LifeBuoy className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">No tickets yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Need help? Create a support ticket and we'll assist you.
                </p>
                <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Your First Ticket
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ticket Detail Dialog */}
        <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Ticket Details
              </DialogTitle>
            </DialogHeader>
            {selectedTicket && (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Subject</Label>
                  <p className="font-semibold">{selectedTicket.subject}</p>
                </div>
                
                <div className="flex gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <Badge className={`${STATUS_CONFIG[selectedTicket.status]?.color || 'bg-muted'} text-white mt-1`}>
                      {STATUS_CONFIG[selectedTicket.status]?.label || selectedTicket.status}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Priority</Label>
                    <Badge variant="outline" className="mt-1 gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${PRIORITIES.find(p => p.value === selectedTicket.priority)?.color || 'bg-muted'}`} />
                      {PRIORITIES.find(p => p.value === selectedTicket.priority)?.label || selectedTicket.priority}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Category</Label>
                    <p className="text-sm mt-1 capitalize">{selectedTicket.category}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Message</Label>
                  <div className="mt-1 p-3 rounded-lg bg-muted/50 text-sm whitespace-pre-wrap">
                    {selectedTicket.message}
                  </div>
                </div>

                <div className="flex justify-between text-xs text-muted-foreground border-t pt-4">
                  <span>Created: {format(new Date(selectedTicket.created_at), 'MMM d, yyyy h:mm a')}</span>
                  {selectedTicket.updated_at !== selectedTicket.created_at && (
                    <span>Updated: {format(new Date(selectedTicket.updated_at), 'MMM d, h:mm a')}</span>
                  )}
                </div>

                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">💬 Support Response:</strong> Our team will respond to your ticket via email. Please check your inbox for updates.
                  </p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Help Section */}
        <h2 className="sr-only">Quick Help</h2>
        <Card className="glass-card border-primary/20">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20">
                <HelpCircle className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">Need Quick Help?</h3>
                <p className="text-sm text-muted-foreground">
                  Check our FAQ or contact us directly for urgent issues
                </p>
              </div>
              <div className="flex gap-2 flex-wrap justify-center">
                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={() => setShowFAQ(!showFAQ)}
                >
                  <HelpCircle className="h-4 w-4" />
                  View FAQ
                  <ChevronDown className={`h-4 w-4 transition-transform ${showFAQ ? 'rotate-180' : ''}`} />
                </Button>
                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={() => {
                    // Directly trigger the LiveChatWidget
                    const chatButton = document.querySelector('[data-live-chat-trigger]') as HTMLButtonElement;
                    if (chatButton) chatButton.click();
                  }}
                >
                  <MessageSquare className="h-4 w-4" />
                  Live Chat
                </Button>
              </div>
            </div>
            
            {/* FAQ Accordion */}
            {showFAQ && (
              <div className="mt-6 pt-6 border-t border-border">
                <Accordion type="single" collapsible className="w-full">
                  {FAQ_ITEMS.map((item, index) => (
                    <AccordionItem key={index} value={`faq-${index}`}>
                      <AccordionTrigger className="text-left hover:no-underline">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
}
