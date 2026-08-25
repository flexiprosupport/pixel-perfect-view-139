import { createFileRoute } from "@tanstack/react-router";
import Auth from "@/pages/Auth";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign In or Create Account | Extips Panel" },
      { name: "description", content: "Log in to your Extips Panel account or sign up in seconds to start ordering real social media engagement." },
      { property: "og:title", content: "Sign In or Create Account | Extips Panel" },
      { property: "og:description", content: "Log in to your Extips Panel account or sign up in seconds to start ordering real social media engagement." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Auth,
});
