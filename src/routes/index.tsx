import { createFileRoute } from "@tanstack/react-router";
import Index from "@/pages/Index";

export const Route = createFileRoute("/")({
  
  head: () => ({
    meta: [
      { title: "FlexiPro — AI-Powered Social Media Growth Panel" },
      { name: "description", content: "Grow on Instagram, YouTube & TikTok with real, human-like engagement. Safe automated delivery, wallet top-ups and live order tracking." },
      { property: "og:title", content: "FlexiPro — AI-Powered Social Media Growth Panel" },
      { property: "og:description", content: "Grow on Instagram, YouTube & TikTok with real, human-like engagement. Safe automated delivery, wallet top-ups and live order tracking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});
