import React from "react";
import { Button } from "@/components/ui/button";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  message?: string;
};

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    // Keep logs for debugging
    console.error("App crash caught by ErrorBoundary:", error);
    console.error("Component stack:", info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              The app hit an unexpected error. Reload the page and try again.
            </p>
          </div>

          {this.state.message && (
            <div className="rounded-lg border border-border bg-muted p-3">
              <p className="text-xs font-mono text-muted-foreground break-words">
                {this.state.message}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button onClick={this.handleReload}>Reload</Button>
            <Button variant="outline" onClick={() => (window.location.href = "/")}>Home</Button>
          </div>
        </div>
      </div>
    );
  }
}
