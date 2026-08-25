import { createFileRoute } from "@tanstack/react-router";
import AdminServiceProviderMapping from "@/pages/admin/AdminServiceProviderMapping";
import { AdminGuard } from "@/components/admin/AdminGuard";

export const Route = createFileRoute("/admin/service-provider-mapping")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin — Service Mapping | FlexiPro" },
      { name: "description", content: "FlexiPro admin tools — internal use only." },
      { property: "og:title", content: "Admin — Service Mapping | FlexiPro" },
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
      <AdminServiceProviderMapping />
    </AdminGuard>
  );
}
