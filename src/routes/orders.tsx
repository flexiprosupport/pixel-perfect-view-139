import { createFileRoute } from "@tanstack/react-router";
import Orders from "@/pages/Orders";

export const Route = createFileRoute("/orders")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Your Orders | FlexiPro" },
      { name: "description", content: "Track delivery, refills and live status of every FlexiPro order." },
      { property: "og:title", content: "Your Orders | FlexiPro" },
      { property: "og:description", content: "Track delivery, refills and live status of every FlexiPro order." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Orders,
});
