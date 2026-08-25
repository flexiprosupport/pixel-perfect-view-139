import { createFileRoute } from "@tanstack/react-router";
import AdminPopupAd from "@/pages/admin/AdminPopupAd";
import { AdminGuard } from "@/components/admin/AdminGuard";

export const Route = createFileRoute("/admin/popup-ad")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin — Popup Ad | FlexiPro" },
      { name: "description", content: "FlexiPro admin tools — internal use only." },
      { property: "og:title", content: "Admin — Popup Ad | FlexiPro" },
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
      <AdminPopupAd />
    </AdminGuard>
  );
}
