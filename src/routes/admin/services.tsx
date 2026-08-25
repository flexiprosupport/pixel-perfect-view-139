import { createFileRoute } from "@tanstack/react-router";
import AdminServices from "@/pages/admin/AdminServices";
import { AdminGuard } from "@/components/admin/AdminGuard";

export const Route = createFileRoute("/admin/services")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin — Services | FlexiPro" },
      { name: "description", content: "FlexiPro admin tools — internal use only." },
      { property: "og:title", content: "Admin — Services | FlexiPro" },
      { property: "og:description", content: "FlexiPro admin tools — internal use only." },
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
      <AdminServices />
    </AdminGuard>
  );
}
