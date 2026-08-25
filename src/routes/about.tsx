import { createFileRoute } from "@tanstack/react-router";
import AboutUs from "@/pages/legal/AboutUs";

export const Route = createFileRoute("/about")({
  
  head: () => ({
    meta: [
      { title: "About Us | FlexiPro" },
      { name: "description", content: "The story behind FlexiPro and our approach to safe, organic social media growth." },
      { property: "og:title", content: "About Us | FlexiPro" },
      { property: "og:description", content: "The story behind FlexiPro and our approach to safe, organic social media growth." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AboutUs,
});
