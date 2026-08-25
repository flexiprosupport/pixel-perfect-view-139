import { createFileRoute } from "@tanstack/react-router";
import AdminSubscriptions from "@/pages/admin/AdminSubscriptions";
import { AdminGuard } from "@/components/admin/AdminGuard";

export const Route = createFileRoute("/admin/subscriptions")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin — Subscriptions | FlexiPro" },
      { name: "description", content: "FlexiPro admin tools — internal use only." },
      { property: "og:title", content: "Admin — Subscriptions | FlexiPro" },
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
      <AdminSubscriptions />
    </AdminGuard>
  );
}
