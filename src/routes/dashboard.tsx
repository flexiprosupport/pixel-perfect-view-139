import { createFileRoute } from "@tanstack/react-router";
import Dashboard from "@/pages/Dashboard";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Dashboard | Extips Panel" },
      { name: "description", content: "Your Extips Panel dashboard — wallet balance, recent orders and growth stats at a glance." },
      { property: "og:title", content: "Dashboard | Extips Panel" },
      { property: "og:description", content: "Your Extips Panel dashboard — wallet balance, recent orders and growth stats at a glance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Dashboard,
});
