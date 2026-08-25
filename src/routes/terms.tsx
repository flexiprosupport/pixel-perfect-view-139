import { createFileRoute } from "@tanstack/react-router";
import TermsOfService from "@/pages/legal/TermsOfService";

export const Route = createFileRoute("/terms")({
  
  head: () => ({
    meta: [
      { title: "Terms of Service | FlexiPro" },
      { name: "description", content: "The terms and conditions that govern your use of FlexiPro services." },
      { property: "og:title", content: "Terms of Service | FlexiPro" },
      { property: "og:description", content: "The terms and conditions that govern your use of FlexiPro services." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TermsOfService,
});
