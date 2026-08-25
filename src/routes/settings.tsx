import { createFileRoute } from "@tanstack/react-router";
import Settings from "@/pages/Settings";

export const Route = createFileRoute("/settings")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Account Settings | Extips Panel" },
      { name: "description", content: "Update your Extips Panel profile, password, currency and notification preferences." },
      { property: "og:title", content: "Account Settings | Extips Panel" },
      { property: "og:description", content: "Update your Extips Panel profile, password, currency and notification preferences." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Settings,
});
