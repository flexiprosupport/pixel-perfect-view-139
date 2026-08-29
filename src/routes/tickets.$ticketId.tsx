import { createFileRoute } from "@tanstack/react-router";
import TicketStatus from "@/pages/TicketStatus";

export const Route = createFileRoute("/tickets/$ticketId")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Ticket Status | FlexiPro" },
      { name: "description", content: "Track your FlexiPro support ticket from submission to resolution." },
      { property: "og:title", content: "Ticket Status | FlexiPro" },
      { property: "og:description", content: "Track your FlexiPro support ticket from submission to resolution." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: TicketStatus,
});
