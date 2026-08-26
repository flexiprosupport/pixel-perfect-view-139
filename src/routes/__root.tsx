import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Suspense, lazy, useEffect, type ReactNode } from "react";

// Non-critical UI: kept out of the initial home-page bundle.
const Toaster = lazy(() =>
  import("@/components/ui/toaster").then((m) => ({ default: m.Toaster })),
);
const Sonner = lazy(() =>
  import("@/components/ui/sonner").then((m) => ({ default: m.Toaster })),
);
import { TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { AuthProvider } from "@/hooks/useAuth";
import { CurrencyProvider } from "@/hooks/useCurrency";
import { ScrollToTop } from "@/components/ScrollToTop";
import { AppErrorBoundary } from "@/components/app/AppErrorBoundary";
import { GlobalSubscriptionGuard } from "@/components/subscription/GlobalSubscriptionGuard";

import appCss from "../styles.css?url";

const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "FlexiPro — AI Social Media Growth Panel" },
      {
        name: "description",
        content:
          "FlexiPro — real Instagram, YouTube & TikTok engagement with natural, human-like delivery. Safe, fast and fully automated.",
      },
      { name: "author", content: "FlexiPro" },
      {
        name: "google-site-verification",
        content: "oCsWPKuOj9ptrMboKhizX4h1na3bYDjObWqDfKACMwM",
      },
      { property: "og:title", content: "FlexiPro — AI Social Media Growth Panel" },
      {
        property: "og:description",
        content:
          "Real Instagram, YouTube & TikTok engagement with natural delivery. 50,000+ orders delivered, zero bans.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#2563EB" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "preload",
        as: "style",
        href: FONTS_HREF,
      },
      {
        rel: "stylesheet",
        href: FONTS_HREF,
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/icon-192x192.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    const handleRejection = (e: PromiseRejectionEvent) => {
      console.error("Unhandled rejection:", e.reason);
      toast.error("An error occurred. Please try again.");
      e.preventDefault();
    };
    const handleError = (e: ErrorEvent) => {
      console.error("Unhandled error:", e.error || e.message);
    };
    // LCP / hydration measurement (dev only) — logs the real bottleneck element.
    let lcpObserver: PerformanceObserver | undefined;
    if (import.meta.env.DEV && "PerformanceObserver" in window) {
      try {
        lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const last = entries[entries.length - 1] as PerformanceEntry & {
            element?: Element;
            url?: string;
          };
          console.info(
            "[perf] LCP",
            Math.round(last.startTime),
            "ms",
            last.element?.tagName ?? last.url ?? "",
          );
        });
        lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
      } catch {
        /* not supported */
      }
    }

    window.addEventListener("unhandledrejection", handleRejection);
    window.addEventListener("error", handleError);
    return () => {
      window.removeEventListener("unhandledrejection", handleRejection);
      window.removeEventListener("error", handleError);
      lcpObserver?.disconnect();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CurrencyProvider>
          <TooltipProvider>
            <Suspense fallback={null}>
              <Toaster />
              <Sonner />
            </Suspense>
            <AppErrorBoundary>
              <ScrollToTop />
              <GlobalSubscriptionGuard>
                {/* Required: nested routes render here. */}
                <Outlet />
              </GlobalSubscriptionGuard>
            </AppErrorBoundary>
          </TooltipProvider>
        </CurrencyProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
