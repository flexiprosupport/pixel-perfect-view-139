import { createFileRoute } from "@tanstack/react-router";
import PrivacyPolicy from "@/pages/legal/PrivacyPolicy";

export const Route = createFileRoute("/privacy")({
  
  head: () => ({
    meta: [
      { title: "Privacy Policy | Extips Panel" },
      { name: "description", content: "How Extips Panel collects, uses and protects your personal data." },
      { property: "og:title", content: "Privacy Policy | Extips Panel" },
      { property: "og:description", content: "How Extips Panel collects, uses and protects your personal data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PrivacyPolicy,
});
