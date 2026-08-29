import { LegalLayout, Section, Bullets, DataTable } from "@/components/legal/LegalLayout";

export default function RefundPolicy() {
  return (
    <LegalLayout
      title="Refund and Cancellation Policy"
      metaTitle="Refund Policy | FlexiPro"
      description="When and how FlexiPro issues refunds, wallet credits and re-delivery for orders and deposits."
      canonicalPath="/refund"
      breadcrumbLabel="Refund Policy"
      effectiveDate="29 August 2026"
      summary={
        <p>
          <strong className="text-foreground">Our promise:</strong> we do not charge for a service portion we
          confirm was not delivered. We investigate duplicate or failed funding fairly, explain our decisions,
          and never describe a legitimate dispute as automatically fraudulent.
        </p>
      }
    >
      <Section title="1. Wallet deposits">
        <Bullets
          items={[
            "Verified duplicate UPI/crypto credit caused by FlexiPro or its processor: the duplicate amount is returned to the original method where technically and legally possible.",
            "Payment debited but wallet not credited: we trace and credit it; if funding failed or cannot be credited, it is returned to the original method.",
            "Unused wallet balance: normally remains available. A cash withdrawal is not guaranteed unless required by law or approved for a verified payment error or account closure.",
            "Crypto sent using a wrong asset, network or address: non-refundable when FlexiPro did not receive it or cannot recover it. Any recovery fee is disclosed and agreed before work begins.",
          ]}
        />
      </Section>

      <Section title="2. Order remedies">
        <DataTable
          head={["Situation", "Remedy"]}
          rows={[
            ["Order did not start and cancellation is available", "Cancel and restore the full order amount to wallet"],
            ["Confirmed total non-delivery", "Re-delivery or full wallet credit; you may choose where practicable"],
            ["Confirmed partial delivery", "Re-delivery or proportional wallet credit for the undelivered portion"],
            ["Wrong service or target caused by FlexiPro", "Correct delivery or wallet credit for the affected amount"],
            ["Natural drop after correct delivery", "Refill only if the service page promised a refill period; otherwise no refund"],
            ["Incorrect, private or deleted target supplied by you", "No refund for processed/delivered work; credit only for a recoverable unprocessed portion"],
          ]}
        />
      </Section>

      <Section title="3. Request window and evidence">
        <p>
          Submit an order claim within 7 days after the stated completion deadline, or within the advertised
          refill period for a refill claim. Provide the order ID and a concise description. Screenshots help but
          are not mandatory when FlexiPro's records can verify the issue. Payment-error claims should be reported
          promptly. Statutory rights are not shortened by this policy.
        </p>
      </Section>

      <Section title="4. Review times">
        <Bullets
          items={[
            "Acknowledgement: within 1 business day.",
            "Initial decision: normally within 3–5 business days.",
            "Approved wallet credit: promptly after approval.",
            "Approved UPI return: normally 5–10 business days after initiation, subject to provider/bank timing.",
            "Crypto refund: only to a verified compatible address and after required compliance checks; disclosed network fees may be deducted.",
          ]}
        />
      </Section>

      <Section title="5. Chargebacks">
        <p>
          Contact us first so we can investigate quickly, but nothing in this policy removes your right to
          contact your bank, payment provider or regulator. We may suspend disputed funds or associated orders
          while a dispute is reviewed and may submit accurate order and payment evidence.
        </p>
      </Section>

      <Section title="6. Appeals">
        <p>
          If you disagree with a decision, reply with additional evidence or email{" "}
          <a className="text-orange-500 hover:underline" href="mailto:flexipro.support@gmail.com">
            flexipro.support@gmail.com
          </a>{" "}
          with the subject "Refund Appeal" and the order ID. A person not responsible for the initial decision
          reviews the appeal within 7 business days where practicable.
        </p>
      </Section>
    </LegalLayout>
  );
}
