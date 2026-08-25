import { createFileRoute } from "@tanstack/react-router";
import ShippingPolicy from "@/pages/legal/ShippingPolicy";

export const Route = createFileRoute("/shipping")({
  
  head: () => ({
    meta: [
      { title: "Delivery Policy | Extips Panel" },
      { name: "description", content: "How Extips Panel delivers digital engagement orders and expected delivery times." },
      { property: "og:title", content: "Delivery Policy | Extips Panel" },
      { property: "og:description", content: "How Extips Panel delivers digital engagement orders and expected delivery times." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ShippingPolicy,
});
