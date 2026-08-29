import { createFileRoute } from "@tanstack/react-router";
import DeliveryPolicy from "@/pages/legal/DeliveryPolicy";

export const Route = createFileRoute("/delivery")({
  head: () => ({
    meta: [
      { title: "Digital Delivery Policy | FlexiPro" },
      { name: "description", content: "How FlexiPro delivers digital orders electronically, timing estimates and delay reasons." },
      { property: "og:title", content: "Digital Delivery Policy | FlexiPro" },
      { property: "og:description", content: "How FlexiPro delivers digital orders electronically, timing estimates and delay reasons." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DeliveryPolicy,
});
