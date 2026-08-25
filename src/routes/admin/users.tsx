import { createFileRoute } from "@tanstack/react-router";
import AdminUsers from "@/pages/admin/AdminUsers";
import { AdminGuard } from "@/components/admin/AdminGuard";

export const Route = createFileRoute("/admin/users")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin — Users | Extips Panel" },
      { name: "description", content: "Extips Panel admin tools — internal use only." },
      { property: "og:title", content: "Admin — Users | Extips Panel" },
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
      <AdminUsers />
    </AdminGuard>
  );
}
