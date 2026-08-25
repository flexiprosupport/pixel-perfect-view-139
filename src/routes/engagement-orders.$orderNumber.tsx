import { createFileRoute } from "@tanstack/react-router";
import EngagementOrderDetail from "@/pages/EngagementOrderDetail";

export const Route = createFileRoute("/engagement-orders/$orderNumber")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Engagement Order Detail | Extips Panel" },
      { name: "description", content: "Live progress, delivery timeline and per-run breakdown for your engagement order." },
      { property: "og:title", content: "Engagement Order Detail | Extips Panel" },
      { property: "og:description", content: "Live progress, delivery timeline and per-run breakdown for your engagement order." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EngagementOrderDetail,
});
