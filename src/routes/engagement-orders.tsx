import { createFileRoute } from "@tanstack/react-router";
import EngagementOrders from "@/pages/EngagementOrders";

export const Route = createFileRoute("/engagement-orders")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Engagement Orders | FlexiPro" },
      { name: "description", content: "All your FlexiPro engagement orders with live delivery progress." },
      { property: "og:title", content: "Engagement Orders | FlexiPro" },
      { property: "og:description", content: "All your FlexiPro engagement orders with live delivery progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EngagementOrders,
});
