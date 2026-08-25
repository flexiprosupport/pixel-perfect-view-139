import { useState } from 'react';
import { Link } from "@/lib/router-compat";
import { useSubscription } from '@/hooks/useSubscription';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SubscriptionRequestDialog } from './SubscriptionRequestDialog';
import {
  Lock,
  Zap,
  Crown,
  Clock,
  CheckCircle2,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface SubscriptionCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubscriptionCheckDialog({ open, onOpenChange }: SubscriptionCheckDialogProps) {
  const { hasPendingRequest } = useSubscription();
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'lifetime'>('monthly');

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              Subscription Required
            </DialogTitle>
            <DialogDescription>
              Choose a plan to start placing orders and unlock all features.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#9b87f5]/10 border border-[#9b87f5]/20">
            <Sparkles className="h-4 w-4 text-[#9b87f5] shrink-0" />
            <p className="text-sm font-semibold text-foreground/80">
              🚀 High-performance Organic Growth for Serious Builders.
            </p>
          </div>

          <div className="py-2">
            {/* Pending Request Notice */}
            {hasPendingRequest && (
              <div className="mb-4 p-4 rounded-xl bg-warning/10 border border-warning/30">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-warning" />
                  <div>
                    <p className="font-medium text-warning">Request Pending</p>
                    <p className="text-sm text-foreground/80">
                      Your subscription request is being reviewed. We'll contact you soon!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Pricing Cards */}
            {!hasPendingRequest && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Monthly Plan */}
                <div
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedPlan === 'monthly'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                    }`}
                  onClick={() => setSelectedPlan('monthly')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Zap className="h-4 w-4 text-primary" />
                    </div>
                    {selectedPlan === 'monthly' && (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <h3 className="font-semibold text-sm mb-1 text-foreground">Monthly Plan</h3>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-2xl font-[1000] text-foreground">$10</span>
                    <span className="text-xs font-bold text-muted-foreground">/month</span>
                  </div>
                  <ul className="space-y-1 text-[11px] font-bold text-muted-foreground/80">
                    <li className="flex items-center gap-1.5 transition-all hover:translate-x-1">
                      <CheckCircle2 className="h-3 w-3 text-blue-500" />
                      Global Markup Control
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-blue-500" />
                      Full Platform Access
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-blue-500" />
                      Cancel Anytime
                    </li>
                  </ul>
                </div>

                {/* Lifetime Plan */}
                <div
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all relative overflow-hidden ${selectedPlan === 'lifetime'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                    }`}
                  onClick={() => setSelectedPlan('lifetime')}
                >
                  <Badge className="absolute top-1.5 right-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-[10px] px-1.5 py-0.5">
                    <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                    Best
                  </Badge>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <Crown className="h-4 w-4 text-amber-500" />
                    </div>
                    {selectedPlan === 'lifetime' && (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <h3 className="font-semibold text-sm mb-1 text-foreground">Lifetime Plan</h3>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-2xl font-[1000] text-foreground">$99</span>
                    <span className="text-xs font-bold text-muted-foreground">one-time</span>
                  </div>
                  <ul className="space-y-1 text-[11px] font-bold text-muted-foreground/80">
                    <li className="flex items-center gap-1.5 transition-all hover:translate-x-1">
                      <CheckCircle2 className="h-3 w-3 text-amber-500" />
                      Lifetime Console Access
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-amber-500" />
                      All Future Updates
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Action Button */}
            {!hasPendingRequest && (
              <Button
                className="w-full btn-gradient rounded-xl py-5 text-base"
                onClick={() => {
                  onOpenChange(false);
                  setShowRequestDialog(true);
                }}
              >
                Get {selectedPlan === 'monthly' ? 'Monthly' : 'Lifetime'} Plan
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}

            {/* Back Link */}
            <div className="text-center mt-3">
              <button
                onClick={() => onOpenChange(false)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ← Continue browsing
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SubscriptionRequestDialog
        open={showRequestDialog}
        onOpenChange={setShowRequestDialog}
        planType={selectedPlan}
      />
    </>
  );
}
