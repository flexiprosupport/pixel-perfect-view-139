import { Link } from "@/lib/router-compat";
import { ArrowLeft, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageMeta } from "@/components/seo/PageMeta";

export default function ShippingPolicy() {
  return (
    <>
      <PageMeta
        title="Shipping & Delivery Policy | FlexiPro"
        description="FlexiPro delivers digital services electronically. Learn about our delivery timelines and process."
        canonicalPath="/shipping"
        breadcrumbs={[{ name: "Home", path: "/" }, { name: "Shipping Policy", path: "/shipping" }]}
      />
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Link to="/">
            <Button variant="ghost" size="sm" className="mb-8 gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Button>
          </Link>

          <h1 className="text-3xl font-bold mb-2">Shipping & Delivery Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: June 11, 2026</p>

          <div className="flex gap-3 p-4 mb-8 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <Zap className="h-5 w-5 shrink-0 mt-0.5 text-orange-500" />
            <p className="text-sm leading-relaxed text-foreground/90">
              FlexiPro provides <strong>100% digital services</strong>. No physical products are shipped. All deliveries are electronic and happen directly on the target social media account/link provided at the time of order.
            </p>
          </div>

          <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">1. Nature of Delivery</h2>
              <p>All services offered by FlexiPro (followers, likes, views, comments, etc.) are digital, intangible services that are fulfilled by our automated system and partner providers directly on the user's social media account or link. There is no physical shipment, courier or postal delivery involved.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">2. Delivery Timelines</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong className="text-foreground">Order Start:</strong> Most orders start within 0 – 60 minutes of successful payment.</li>
                <li><strong className="text-foreground">Standard Delivery:</strong> Depending on service & quantity, completion can take from a few minutes up to 7 days.</li>
                <li><strong className="text-foreground">Organic Mode:</strong> Orders placed with organic delivery enabled are intentionally spread across multiple days/weeks to mimic natural growth patterns.</li>
                <li><strong className="text-foreground">Subscription / Drip-feed:</strong> Delivered as per the chosen schedule.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">3. Order Confirmation</h2>
              <p>Upon successful payment, an order confirmation will be visible immediately in your dashboard under "Orders". You will also receive notifications by email and (where enabled) live chat updates.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">4. Delivery Failures</h2>
              <p>In rare cases of provider failure, the order will either be auto-retried or marked as failed and the wallet amount will be refunded automatically. See our <Link className="text-orange-500 hover:underline" to="/refund">Refund Policy</Link> for details.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">5. International Customers</h2>
              <p>Since all services are digital, they are delivered worldwide without any shipping charges or customs concerns.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">6. Contact</h2>
              <p>For any delivery related queries, contact us at <a className="text-orange-500 hover:underline" href="mailto:flexipro.support@gmail.com">flexipro.support@gmail.com</a> or WhatsApp <a className="text-orange-500 hover:underline" href="https://wa.me/13678288027" target="_blank" rel="noreferrer">+1 (367) 828-8027</a>.</p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}