import { createFileRoute } from "@tanstack/react-router";
import ApiAccess from "@/pages/ApiAccess";

export const Route = createFileRoute("/api-access")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "API Access | FlexiPro" },
      { name: "description", content: "Integrate FlexiPro with your own tools using the developer API and your personal API key." },
      { property: "og:title", content: "API Access | FlexiPro" },
      { property: "og:description", content: "Integrate FlexiPro with your own tools using the developer API and your personal API key." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ApiAccess,
});
