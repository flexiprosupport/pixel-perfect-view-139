import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Loader2,
  Zap,
  Crown,
  CheckCircle2,
  User,
  Mail,
  Phone,
  MessageSquare,
  Sparkles,
  Shield,
  LockKeyhole,
} from 'lucide-react';
import { z } from 'zod';
import { cn } from '@/lib/utils';

// International phone regex - accepts: +1234567890, 1234567890, +91 9876543210, etc.
const phoneRegex = /^(\+?\d{1,4}[\s-]?)?(\(?\d{2,4}\)?[\s-]?)?\d{6,10}$/;
const normalizePhone = (v: string) => v.replace(/[\s\-()]/g, '');

const requestSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(3, 'Name must be at least 3 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'),
  phone: z
    .string()
    .trim()
    .transform((v) => normalizePhone(v))
    .refine((v) => v.length >= 7 && v.length <= 15 && /^\+?\d+$/.test(v), {
      message: 'Enter a valid phone number (7-15 digits, e.g., +1234567890)',
    }),
  message: z.string().trim().max(300, 'Message must be less than 300 characters').optional(),
});

interface SubscriptionRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planType: 'monthly' | 'lifetime';
}

export function SubscriptionRequestDialog({
  open,
  onOpenChange,
  planType
}: SubscriptionRequestDialogProps) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    phone: '',
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Please login first');

      const validation = requestSchema.safeParse(formData);
      if (!validation.success) {
        const fieldErrors: Record<string, string> = {};
        validation.error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);

        // Auto-focus + scroll to the first invalid field
        const firstField = validation.error.errors[0]?.path?.[0];
        if (typeof firstField === 'string') {
          setTimeout(() => {
            const el = document.getElementById(firstField) as HTMLInputElement | null;
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el?.focus?.();
          }, 0);
        }

        // Show a specific error in the toast (instead of a generic message)
        const firstMessage = validation.error.errors[0]?.message || 'Please fix the highlighted fields';
        throw new Error(firstMessage);
      }

      setErrors({});

      // Step 1: Create subscription request in database
      const { data: requestData, error } = await supabase.from('subscription_requests').insert([
        {
          user_id: user.id,
          email: profile?.email || user.email || '',
          full_name: validation.data.full_name,
          phone: validation.data.phone,
          plan_type: planType,
          message: validation.data.message || null,
        },
      ]).select().single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('You already have a pending request');
        }
        throw error;
      }

      // Step 2: Get or create chat conversation for this user
      let conversationId: string;

      // Get MOST RECENT conversation regardless of status (chat history is permanent)
      const { data: existingConv } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingConv) {
        conversationId = existingConv.id;
      } else {
        // Create new conversation
        const { data: newConv, error: convError } = await supabase
          .from('chat_conversations')
          .insert({
            user_id: user.id,
            user_email: profile?.email || user.email || '',
            user_name: validation.data.full_name,
          })
          .select()
          .single();

        if (convError) throw convError;
        conversationId = newConv.id;
      }

      // Step 3: Send subscription request as a formatted chat message
      const planName = planType === 'monthly' ? 'Monthly Plan ($10/month)' : 'Lifetime Plan ($99)';
      const messageContent = `📋 SUBSCRIPTION REQUEST

🎯 Plan: ${planName}
👤 Name: ${validation.data.full_name}
📧 Email: ${profile?.email || user.email}
📞 Phone: ${validation.data.phone}
${validation.data.message ? `💬 Message: ${validation.data.message}` : ''}

---
Please review and approve/reject this subscription request.
Request ID: ${requestData.id}`;

      const { error: msgError } = await supabase.from('chat_messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        sender_role: 'user',
        message: messageContent,
      });

      if (msgError) {
        console.error('Failed to send chat message:', msgError);
      }

      // Admin notification handled server-side via the subscription_requests row +
      // existing admin dashboard / chat. (Direct Telegram from user blocked for security.)
    },
    onSuccess: () => {
      toast.success('Request submitted! Opening Live Chat...');
      queryClient.invalidateQueries({ queryKey: ['subscription-requests'] });
      queryClient.invalidateQueries({ queryKey: ['user-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      queryClient.invalidateQueries({ queryKey: ['user-chat-conversation'] });
      onOpenChange(false);
      setFormData({ full_name: profile?.full_name || '', phone: '', message: '' });

      // Auto-open Live Chat widget after form submission
      setTimeout(() => {
        const chatTrigger = document.querySelector('[data-live-chat-trigger]') as HTMLButtonElement | null;
        if (chatTrigger) {
          chatTrigger.click();
        }
      }, 500);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const planDetails = planType === 'monthly'
    ? {
      price: '$10',
      period: '/month',
      icon: Zap,
      color: 'primary',
      gradient: 'from-primary/20 to-primary/5',
      features: ['Global Markup Control', 'Full platform access', 'All organic features', 'Cancel anytime']
    }
    : {
      price: '$99',
      period: ' lifetime',
      icon: Crown,
      color: 'warning',
      gradient: 'from-warning/20 to-warning/5',
      features: ['Full platform access', 'All organic features', 'Priority support', 'Forever access']
    };

  const PlanIcon = planDetails.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden border-0 bg-gradient-to-b from-background to-muted/30">
        {/* Header with Gradient */}
        <div className={cn(
          "relative px-6 pt-8 pb-6 bg-gradient-to-br",
          planType === 'monthly' ? 'from-primary/10 via-primary/5 to-transparent' : 'from-warning/10 via-warning/5 to-transparent'
        )}>
          <div className="absolute top-4 right-4">
            <Sparkles className={cn(
              "h-5 w-5",
              planType === 'monthly' ? 'text-primary/40' : 'text-warning/40'
            )} />
          </div>

          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center",
                planType === 'monthly'
                  ? 'bg-gradient-to-br from-primary to-primary/70'
                  : 'bg-gradient-to-br from-warning to-warning/70'
              )}>
                <PlanIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">
                  {planType === 'monthly' ? 'Monthly' : 'Lifetime'} Plan
                </DialogTitle>
                <DialogDescription className="text-sm">
                  Fill your details to get started
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Price Display */}
          <div className="mt-4 flex items-baseline gap-1">
            <span className={cn(
              "text-4xl font-bold",
              planType === 'monthly' ? 'text-primary' : 'text-warning'
            )}>
              {planDetails.price}
            </span>
            <span className="text-muted-foreground text-sm">{planDetails.period}</span>
          </div>

          {/* Features */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {planDetails.features.map((feature, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle2 className={cn(
                  "h-4 w-4 shrink-0",
                  planType === 'monthly' ? 'text-primary' : 'text-warning'
                )} />
                <span className="text-xs text-muted-foreground">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Form Section */}
        <div className="px-6 pb-6 space-y-4">
          {Object.values(errors).some(Boolean) && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-sm font-semibold text-destructive">Please fix these fields:</p>
              <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">
                {Object.entries(errors)
                  .filter(([_, msg]) => !!msg)
                  .map(([key, msg]) => (
                    <li key={key}>
                      <span className="capitalize">{key.replace('_', ' ')}</span>: {msg}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="full_name" className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Full Name
            </Label>
            <div className="relative">
              <Input
                id="full_name"
                value={profile?.full_name || ''}
                readOnly
                className="h-12 rounded-xl pl-4 pr-10 transition-all bg-muted/50 text-muted-foreground cursor-not-allowed"
              />
              <LockKeyhole className="absolute right-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground/40" />
            </div>
            {errors.full_name && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <span className="inline-block w-1 h-1 rounded-full bg-destructive" />
                {errors.full_name}
              </p>
            )}
          </div>

          {/* Email (Disabled) */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Email Address
            </Label>
            <div className="relative">
              <Input
                id="email"
                value={profile?.email || user?.email || ''}
                disabled
                className="h-12 rounded-xl bg-muted/50 text-muted-foreground"
              />
              <Shield className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            </div>
            <p className="text-[10px] text-muted-foreground">Email is auto-filled from your account</p>
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              Phone Number
            </Label>
            <div className="relative">
              <Input
                id="phone"
                placeholder="+1 234 567 8901"
                value={formData.phone}
                onChange={(e) => {
                  setFormData({ ...formData, phone: e.target.value });
                  if (errors.phone) setErrors({ ...errors, phone: '' });
                }}
                onFocus={() => setFocusedField('phone')}
                onBlur={() => setFocusedField(null)}
                className={cn(
                  "h-12 rounded-xl pl-4 pr-10 transition-all",
                  errors.phone
                    ? "border-destructive focus-visible:ring-destructive/30"
                    : focusedField === 'phone'
                      ? "border-primary"
                      : ""
                )}
              />
              {formData.phone && !errors.phone && (() => {
                const normalized = normalizePhone(formData.phone);
                return normalized.length >= 7 && normalized.length <= 15 && /^\+?\d+$/.test(normalized);
              })() && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-success" />
                )}
            </div>
            {errors.phone && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <span className="inline-block w-1 h-1 rounded-full bg-destructive" />
                {errors.phone}
              </p>
            )}
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              Message <span className="text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Textarea
              id="message"
              placeholder="Any questions or special requests..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="min-h-[80px] rounded-xl resize-none"
              maxLength={300}
            />
            <div className="flex justify-end">
              <span className="text-[10px] text-muted-foreground">
                {formData.message.length}/300
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-12 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
              className={cn(
                "flex-1 h-12 rounded-xl font-semibold",
                planType === 'lifetime' && "bg-warning hover:bg-warning/90 text-warning-foreground"
              )}
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Submit Request
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
