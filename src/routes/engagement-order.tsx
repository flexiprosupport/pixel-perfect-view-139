import { createFileRoute } from "@tanstack/react-router";
import EngagementOrder from "@/pages/EngagementOrder";

export const Route = createFileRoute("/engagement-order")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "New Engagement Order | FlexiPro" },
      { name: "description", content: "Design a custom organic growth curve and place a multi-type engagement order." },
      { property: "og:title", content: "New Engagement Order | FlexiPro" },
      { property: "og:description", content: "Design a custom organic growth curve and place a multi-type engagement order." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EngagementOrder,
});
