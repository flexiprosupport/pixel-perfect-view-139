import { createFileRoute } from "@tanstack/react-router";
import CookiePolicy from "@/pages/legal/CookiePolicy";

export const Route = createFileRoute("/cookies")({
  
  head: () => ({
    meta: [
      { title: "Cookie Policy | Extips Panel" },
      { name: "description", content: "How Extips Panel uses cookies and similar technologies on this site." },
      { property: "og:title", content: "Cookie Policy | Extips Panel" },
      { property: "og:description", content: "How Extips Panel uses cookies and similar technologies on this site." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CookiePolicy,
});
