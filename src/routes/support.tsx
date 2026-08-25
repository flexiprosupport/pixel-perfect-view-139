import { createFileRoute } from "@tanstack/react-router";
import Support from "@/pages/Support";

export const Route = createFileRoute("/support")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Support & Tickets | FlexiPro" },
      { name: "description", content: "Raise a ticket or chat with the FlexiPro team for order and payment help." },
      { property: "og:title", content: "Support & Tickets | FlexiPro" },
      { property: "og:description", content: "Raise a ticket or chat with the FlexiPro team for order and payment help." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Support,
});
