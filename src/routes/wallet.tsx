import { createFileRoute } from "@tanstack/react-router";
import Wallet from "@/pages/Wallet";

export const Route = createFileRoute("/wallet")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Wallet & Deposits | Extips Panel" },
      { name: "description", content: "Top up your Extips Panel wallet with UPI or crypto and review your transaction history." },
      { property: "og:title", content: "Wallet & Deposits | Extips Panel" },
      { property: "og:description", content: "Top up your Extips Panel wallet with UPI or crypto and review your transaction history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Wallet,
});
