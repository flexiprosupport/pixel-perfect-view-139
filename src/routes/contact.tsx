import { createFileRoute } from "@tanstack/react-router";
import ContactUs from "@/pages/legal/ContactUs";

export const Route = createFileRoute("/contact")({
  
  head: () => ({
    meta: [
      { title: "Contact Us | FlexiPro" },
      { name: "description", content: "Get in touch with the FlexiPro team for support, billing or partnership queries." },
      { property: "og:title", content: "Contact Us | FlexiPro" },
      { property: "og:description", content: "Get in touch with the FlexiPro team for support, billing or partnership queries." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContactUs,
});
