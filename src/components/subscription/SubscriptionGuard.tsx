import { useState } from 'react';
import { Link } from "@/lib/router-compat";
import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardContent } from '@/components/ui/card';
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

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const { hasActiveSubscription, hasPendingRequest, isLoading } = useSubscription();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'lifetime'>('monthly');

  // If loading, show nothing to prevent flash
  if (isLoading) {
    return <>{children}</>;
  }

  // If has active subscription, show children
  if (hasActiveSubscription) {
    return <>{children}</>;
  }

  // Show subscription required UI
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="glass-card max-w-2xl w-full">
        <CardContent className="p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-4">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Subscription Required</h2>
            <p className="text-muted-foreground">
              Choose a plan to unlock all features and start placing orders.
            </p>
          </div>

          {/* Pending Request Notice */}
          {hasPendingRequest && (
            <div className="mb-6 p-4 rounded-xl bg-warning/10 border border-warning/30">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-warning" />
                <div>
                  <p className="font-medium text-warning">Request Pending</p>
                  <p className="text-sm text-muted-foreground">
                    Your subscription request is being reviewed. We'll contact you soon!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Pricing Cards */}
          {!hasPendingRequest && (
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              {/* Monthly Plan */}
              <div 
                className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedPlan === 'monthly' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedPlan('monthly')}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                  {selectedPlan === 'monthly' && (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  )}
                </div>
                <h3 className="font-semibold mb-1">Monthly Plan</h3>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-3xl font-bold">$20</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-success" />
                    Full platform access
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-success" />
                    Cancel anytime
                  </li>
                </ul>
              </div>

              {/* Lifetime Plan */}
              <div 
                className={`p-5 rounded-xl border-2 cursor-pointer transition-all relative overflow-hidden ${
                  selectedPlan === 'lifetime' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedPlan('lifetime')}
              >
                <Badge className="absolute top-2 right-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Best Value
                </Badge>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Crown className="h-5 w-5 text-amber-500" />
                  </div>
                  {selectedPlan === 'lifetime' && (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  )}
                </div>
                <h3 className="font-semibold mb-1">Lifetime Plan</h3>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-3xl font-bold">$199</span>
                  <span className="text-muted-foreground">one-time</span>
                </div>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-success" />
                    Forever access
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-success" />
                    All future updates
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Action Button */}
          {!hasPendingRequest && (
            <Button 
              className="w-full btn-gradient rounded-full py-6 text-lg"
              onClick={() => setShowDialog(true)}
            >
              Get {selectedPlan === 'monthly' ? 'Monthly' : 'Lifetime'} Plan
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          )}

          {/* Back Link */}
          <div className="text-center mt-4">
            <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
              ← Back to Dashboard
            </Link>
          </div>
        </CardContent>
      </Card>

      <SubscriptionRequestDialog 
        open={showDialog}
        onOpenChange={setShowDialog}
        planType={selectedPlan}
      />
    </div>
  );
}
