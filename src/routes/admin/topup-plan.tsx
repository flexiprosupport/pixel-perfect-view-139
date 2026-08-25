import { createFileRoute } from "@tanstack/react-router";
import AdminTopupPlan from "@/pages/admin/AdminTopupPlan";
import { AdminGuard } from "@/components/admin/AdminGuard";

export const Route = createFileRoute("/admin/topup-plan")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin — Topup Plan | FlexiPro" },
      { name: "description", content: "FlexiPro admin tools — internal use only." },
      { property: "og:title", content: "Admin — Topup Plan | FlexiPro" },
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
      <AdminTopupPlan />
    </AdminGuard>
  );
}
