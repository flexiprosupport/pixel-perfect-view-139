import { createFileRoute } from "@tanstack/react-router";
import RefundPolicy from "@/pages/legal/RefundPolicy";

export const Route = createFileRoute("/refund")({
  
  head: () => ({
    meta: [
      { title: "Refund Policy | Extips Panel" },
      { name: "description", content: "When and how refunds are issued for Extips Panel orders and wallet deposits." },
      { property: "og:title", content: "Refund Policy | Extips Panel" },
      { property: "og:description", content: "When and how refunds are issued for Extips Panel orders and wallet deposits." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RefundPolicy,
});
