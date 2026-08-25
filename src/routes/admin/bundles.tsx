import { createFileRoute } from "@tanstack/react-router";
import AdminBundles from "@/pages/admin/AdminBundles";
import { AdminGuard } from "@/components/admin/AdminGuard";

export const Route = createFileRoute("/admin/bundles")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin — Bundles | Extips Panel" },
      { name: "description", content: "Extips Panel admin tools — internal use only." },
      { property: "og:title", content: "Admin — Bundles | Extips Panel" },
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
      <AdminBundles />
    </AdminGuard>
  );
}
