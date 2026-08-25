import { createFileRoute } from "@tanstack/react-router";
import AdminProviderAccounts from "@/pages/admin/AdminProviderAccounts";
import { AdminGuard } from "@/components/admin/AdminGuard";

export const Route = createFileRoute("/admin/provider-accounts")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin — Provider Accounts | Extips Panel" },
      { name: "description", content: "Extips Panel admin tools — internal use only." },
      { property: "og:title", content: "Admin — Provider Accounts | Extips Panel" },
      { property: "og:description", content: "Extips Panel admin tools — internal use only." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <AdminGuard>
      <AdminProviderAccounts />
    </AdminGuard>
  );
}
