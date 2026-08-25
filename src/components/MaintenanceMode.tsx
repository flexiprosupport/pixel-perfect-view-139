import { Settings, Wrench, Sparkles, Clock } from 'lucide-react';

export function MaintenancePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-lg w-full text-center space-y-8">
        {/* Animated icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shadow-2xl shadow-primary/10">
              <Wrench className="h-12 w-12 text-primary animate-pulse" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
              <Settings className="h-4 w-4 text-primary-foreground animate-spin" style={{ animationDuration: '3s' }} />
            </div>
          </div>
        </div>

        {/* Main heading */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
            We'll Be Right Back!
          </h1>
          <div className="w-16 h-1 bg-gradient-to-r from-primary to-primary/40 mx-auto rounded-full" />
        </div>

        {/* Description */}
        <div className="space-y-4 px-4">
          <p className="text-lg text-muted-foreground leading-relaxed">
            We're working behind the scenes to bring you something amazing. Our team is rolling out exciting updates and new features to make your experience even better.
          </p>
          <p className="text-muted-foreground">
            This won't take long — hang tight, and we'll be back before you know it!
          </p>
        </div>

        {/* Feature hints */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-4">
          <div className="flex items-center gap-3 bg-card/50 border border-border/50 rounded-xl p-4 text-left">
            <Sparkles className="h-5 w-5 text-primary shrink-0" />
            <span className="text-sm text-muted-foreground">New features coming soon</span>
          </div>
          <div className="flex items-center gap-3 bg-card/50 border border-border/50 rounded-xl p-4 text-left">
            <Clock className="h-5 w-5 text-primary shrink-0" />
            <span className="text-sm text-muted-foreground">Back shortly — stay tuned</span>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-xs text-muted-foreground/60 pt-4">
          Thank you for your patience. We appreciate your support!
        </p>
      </div>
    </div>
  );
}
