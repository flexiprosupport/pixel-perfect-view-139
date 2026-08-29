import { LegalLayout, Section, Bullets } from "@/components/legal/LegalLayout";

export default function DeliveryPolicy() {
  return (
    <LegalLayout
      title="Digital Delivery Policy"
      metaTitle="Digital Delivery Policy | FlexiPro"
      description="FlexiPro sells digital services only. Learn how orders are delivered electronically, timing estimates and your responsibilities."
      canonicalPath="/delivery"
      breadcrumbLabel="Delivery Policy"
      effectiveDate="29 August 2026"
      summary={
        <p>
          FlexiPro sells <strong className="text-foreground">digital services only</strong>. Nothing is shipped by
          courier or post. Delivery occurs electronically against the public target URL or account submitted in
          the order.
        </p>
      }
    >
      <Section title="Order lifecycle">
        <Bullets
          items={[
            "Payment or wallet balance is confirmed.",
            "The order is validated for format, visibility and availability.",
            "The dashboard shows queued, processing, partial, completed, cancelled or failed status.",
            "Delivery is measured against the starting count where the platform exposes a reliable count.",
            "A failed or undelivered portion is handled under the Refund Policy.",
          ]}
        />
      </Section>

      <Section title="Timing">
        <p>
          Each service page states an estimated start range and estimated completion range. Drip-feed or
          scheduled pacing is an estimate of delivery speed — it is not evidence that engagement is organic or
          platform-approved. Delays may result from target privacy, platform outages or changes, supplier
          capacity, order review, unsupported content or force majeure.
        </p>
      </Section>

      <Section title="Customer responsibilities">
        <Bullets
          items={[
            "Submit the exact supported URL and keep required targets public during delivery.",
            "Do not change usernames, delete content or place overlapping orders while an order is processing.",
            "Check platform and legal requirements before purchase.",
            "Report a stalled order with the order ID; never send a social-media password.",
          ]}
        />
      </Section>
    </LegalLayout>
  );
}
