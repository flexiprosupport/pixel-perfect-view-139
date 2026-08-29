import { createFileRoute } from "@tanstack/react-router";
import EthicalUse from "@/pages/legal/EthicalUse";

export const Route = createFileRoute("/ethical-use")({
  head: () => ({
    meta: [
      { title: "Ethical Use Policy | FlexiPro" },
      { name: "description", content: "Prohibited manipulation, deceptive influence and harmful use of FlexiPro services." },
      { property: "og:title", content: "Ethical Use Policy | FlexiPro" },
      { property: "og:description", content: "Prohibited manipulation, deceptive influence and harmful use of FlexiPro services." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EthicalUse,
});
