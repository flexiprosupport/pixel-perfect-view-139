import { createFileRoute } from "@tanstack/react-router";
import Orders from "@/pages/Orders";

export const Route = createFileRoute("/orders")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Your Orders | Extips Panel" },
      { name: "description", content: "Track delivery, refills and live status of every Extips Panel order." },
      { property: "og:title", content: "Your Orders | Extips Panel" },
      { property: "og:description", content: "Track delivery, refills and live status of every Extips Panel order." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Orders,
});
