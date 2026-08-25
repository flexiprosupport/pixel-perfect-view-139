import { createFileRoute } from "@tanstack/react-router";
import AdminAuditLog from "@/pages/admin/AdminAuditLog";
import { AdminGuard } from "@/components/admin/AdminGuard";

export const Route = createFileRoute("/admin/audit-log")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin — Audit Log | Extips Panel" },
      { name: "description", content: "Extips Panel admin tools — internal use only." },
      { property: "og:title", content: "Admin — Audit Log | Extips Panel" },
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
      <AdminAuditLog />
    </AdminGuard>
  );
}
