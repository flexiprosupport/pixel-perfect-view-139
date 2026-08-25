import { createFileRoute } from "@tanstack/react-router";
import CookiePolicy from "@/pages/legal/CookiePolicy";

export const Route = createFileRoute("/cookies")({
  
  head: () => ({
    meta: [
      { title: "Cookie Policy | FlexiPro" },
      { name: "description", content: "How FlexiPro uses cookies and similar technologies on this site." },
      { property: "og:title", content: "Cookie Policy | FlexiPro" },
      { property: "og:description", content: "How FlexiPro uses cookies and similar technologies on this site." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CookiePolicy,
});
