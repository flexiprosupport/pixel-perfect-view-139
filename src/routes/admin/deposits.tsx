import { createFileRoute } from "@tanstack/react-router";
import AdminDeposits from "@/pages/admin/AdminDeposits";
import { AdminGuard } from "@/components/admin/AdminGuard";

export const Route = createFileRoute("/admin/deposits")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin — Deposits | Extips Panel" },
      { name: "description", content: "Extips Panel admin tools — internal use only." },
      { property: "og:title", content: "Admin — Deposits | Extips Panel" },
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
      <AdminDeposits />
    </AdminGuard>
  );
}
