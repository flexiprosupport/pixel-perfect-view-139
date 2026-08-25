import { createFileRoute } from "@tanstack/react-router";
import AdminCronMonitor from "@/pages/admin/AdminCronMonitor";
import { AdminGuard } from "@/components/admin/AdminGuard";

export const Route = createFileRoute("/admin/cron-monitor")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin — Cron Monitor | FlexiPro" },
      { name: "description", content: "FlexiPro admin tools — internal use only." },
      { property: "og:title", content: "Admin — Cron Monitor | FlexiPro" },
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
      <AdminCronMonitor />
    </AdminGuard>
  );
}
