import { Link } from "@/lib/router-compat";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageMeta } from "@/components/seo/PageMeta";

export default function RefundPolicy() {
  return (
    <>
      <PageMeta title="Refund Policy | FlexiPro" description="Understand FlexiPro's refund and cancellation policies." canonicalPath="/refund" breadcrumbs={[{ name: "Home", path: "/" }, { name: "Refund Policy", path: "/refund" }]} />
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Link to="/"><Button variant="ghost" size="sm" className="mb-8 gap-2"><ArrowLeft className="h-4 w-4" /> Back to Home</Button></Link>

          <h1 className="text-3xl font-bold mb-2">Refund Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: February 22, 2026</p>

          {/* Warning box */}
          <div className="flex gap-3 p-4 mb-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400/90">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="text-sm leading-relaxed">
              <strong className="text-amber-400">Notice:</strong> FlexiPro provides <strong>intangible digital services</strong>. Once services are delivered, they cannot be reversed or returned. Please read this policy carefully before making a purchase.
            </p>
          </div>

          <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">1. Overview</h2>
              <p>At FlexiPro, we provide digital social media engagement services. Due to the intangible, immediately-consumable nature of digital services, our refund policy is necessarily limited. By using our services, you confirm that you have read and agreed to this Refund Policy and our Terms of Service before making any purchase.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">2. Digital Services — No Return Possible</h2>
              <p>Social media engagement (views, followers, likes, comments, etc.) is a <strong className="text-foreground">digital service delivered electronically</strong>. Once delivery has begun:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>The service cannot be physically "returned"</li>
                <li>Delivered engagement cannot be "recalled" by us from third-party platforms</li>
                <li>The service is considered consumed upon delivery</li>
                <li>This is consistent with standard practice for all digital goods and services globally</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">3. Wallet Deposits</h2>
              <p>Funds added to your FlexiPro wallet are considered <strong className="text-foreground">service credits</strong> and are generally non-refundable. Refunds for wallet deposits may be considered only under:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Duplicate charges caused by a verified payment processing error</li>
                <li>Unauthorized transactions reported within <strong className="text-foreground">48 hours</strong> of occurrence with supporting evidence</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">4. Order Refunds (Wallet Credits Only)</h2>
              <p>Refunds for individual orders are provided exclusively as <strong className="text-foreground">wallet credits</strong> (not cash) under these conditions:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong className="text-foreground">Non-Delivery:</strong> If an order is not delivered within the estimated timeframe and <em>no partial delivery</em> has occurred, a full wallet credit will be issued</li>
                <li><strong className="text-foreground">Partial Delivery:</strong> A proportional wallet credit will be issued for the undelivered portion only</li>
                <li><strong className="text-foreground">Service Error:</strong> If we delivered the wrong service or incorrect quantity due to our error, a full wallet credit or re-delivery will be provided</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">5. Non-Refundable Situations</h2>
              <p>Refunds will <strong className="text-foreground">NOT</strong> be issued in the following cases:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Orders placed with incorrect links, usernames, or information provided by you</li>
                <li>Natural drops in engagement (e.g., unfollows, unlike) that occur after delivery — this is inherent to social media platforms</li>
                <li>Account suspension, deletion, restriction, or shadow-ban by the third-party social media platform</li>
                <li>Services that have been fully delivered as ordered</li>
                <li>Violation of our Terms of Service by the user</li>
                <li>Change of mind after the order has been submitted and processing has begun</li>
                <li>Results that did not meet personal expectations when services were delivered correctly</li>
                <li>Subscription fees for periods where services were used</li>
                <li>Wallet credits already used toward orders</li>
                <li>Orders where the social media account was made private or deleted after ordering</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">6. Subscription Refunds</h2>
              <p>Subscription fees are <strong className="text-foreground">non-refundable</strong> once the subscription period has begun. If you cancel your subscription, you will retain access until the end of the current billing period. No prorated refunds will be issued for unused time within a billing cycle.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">7. Chargebacks & Payment Disputes — IMPORTANT</h2>
              <div className="p-4 rounded-xl bg-red-500/8 border border-red-500/15 space-y-2">
                <p className="text-foreground font-semibold">Chargeback Abuse Policy:</p>
                <p>Initiating a chargeback or payment dispute with your bank or credit card company <strong className="text-foreground">without first contacting us</strong> and allowing us 5 business days to resolve your issue is considered a <strong className="text-foreground">fraudulent act</strong> and breach of contract.</p>
                <p>If you initiate a chargeback, we will:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Immediately and permanently suspend your account and all associated accounts</li>
                  <li>Submit full evidence including delivery logs, login records, and transaction records to dispute the chargeback</li>
                  <li>Report your account for payment abuse to our payment processors</li>
                  <li>Reserve the right to pursue civil legal remedies for losses incurred</li>
                  <li>Share relevant information with law enforcement if required</li>
                </ul>
                <p className="mt-2">If you have a legitimate issue, <strong className="text-foreground">please contact us first</strong> — we are always willing to resolve genuine concerns fairly.</p>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">8. How to Request a Refund or Credit</h2>
              <p>To request a wallet credit:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Contact our support team through the Support page or Live Chat</li>
                <li>Provide your order number, account email, and a detailed description of the issue</li>
                <li>Include any relevant screenshots or evidence</li>
                <li>Submit your request within <strong className="text-foreground">7 days</strong> of the order date — requests after this window will not be considered</li>
              </ul>
              <p>We aim to review and respond to all refund requests within <strong className="text-foreground">3–5 business days</strong>.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">9. Processing Time</h2>
              <p>Approved wallet credits are processed immediately upon approval. Exceptional cash refunds (if approved) may take 5–10 business days depending on your bank or payment provider.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">10. Disputes</h2>
              <p>If you disagree with a refund decision, you may escalate by emailing <strong className="text-foreground">flexipro.support@gmail.com</strong> with additional evidence. We will review escalated cases within 7 business days. Our decision on escalated cases is final.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">11. Changes to This Policy</h2>
              <p>We reserve the right to modify this Refund Policy at any time. Changes will be effective immediately upon posting. Your continued use of our services constitutes acceptance of the updated policy.</p>
            </section>

          </div>
        </div>
      </div>
    </>
  );
}
