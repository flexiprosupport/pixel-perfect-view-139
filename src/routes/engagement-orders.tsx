import { createFileRoute } from "@tanstack/react-router";
import EngagementOrders from "@/pages/EngagementOrders";

export const Route = createFileRoute("/engagement-orders")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Engagement Orders | Extips Panel" },
      { name: "description", content: "All your Extips Panel engagement orders with live delivery progress." },
      { property: "og:title", content: "Engagement Orders | Extips Panel" },
      { property: "og:description", content: "All your Extips Panel engagement orders with live delivery progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EngagementOrders,
});
