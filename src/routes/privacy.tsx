import { createFileRoute } from "@tanstack/react-router";
import PrivacyPolicy from "@/pages/legal/PrivacyPolicy";

export const Route = createFileRoute("/privacy")({
  
  head: () => ({
    meta: [
      { title: "Privacy Policy | FlexiPro" },
      { name: "description", content: "How FlexiPro collects, uses and protects your personal data." },
      { property: "og:title", content: "Privacy Policy | FlexiPro" },
      { property: "og:description", content: "How FlexiPro collects, uses and protects your personal data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PrivacyPolicy,
});
