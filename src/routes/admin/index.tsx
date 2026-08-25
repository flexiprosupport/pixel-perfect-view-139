import { createFileRoute } from "@tanstack/react-router";
import Admin from "@/pages/admin/Admin";
import { AdminGuard } from "@/components/admin/AdminGuard";

export const Route = createFileRoute("/admin/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin Overview | FlexiPro" },
      { name: "description", content: "FlexiPro admin tools — internal use only." },
      { property: "og:title", content: "Admin Overview | FlexiPro" },
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
      <Admin />
    </AdminGuard>
  );
}
