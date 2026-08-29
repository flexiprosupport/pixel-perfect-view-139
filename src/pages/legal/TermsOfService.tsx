import { LegalLayout, Section, Bullets } from "@/components/legal/LegalLayout";

export default function TermsOfService() {
  return (
    <LegalLayout
      title="Terms of Service"
      metaTitle="Terms of Service | FlexiPro"
      description="The terms and conditions that govern your use of FlexiPro's prepaid digital promotion services."
      canonicalPath="/terms"
      breadcrumbLabel="Terms of Service"
      effectiveDate="29 August 2026"
      summary={
        <p>
          <strong className="text-foreground">Plain-language summary:</strong> You buy prepaid digital
          promotional services. Results, retention and third-party account safety are not guaranteed. You must
          own or be authorized to promote the submitted account or content and must follow the law, these Terms
          and platform rules.
        </p>
      }
    >
      <Section title="1. Agreement and operator">
        <p>
          These Terms of Service ("Terms") form an agreement between you and FlexiPro LLC ("FlexiPro", "we",
          "us" or "our") concerning flexipro.in, its dashboard, wallet, API and related support (together, the
          "Service"). By creating an account, adding funds, placing an order or using the API, you agree to
          these Terms and the policies incorporated by reference. If you do not agree, do not use the Service.
        </p>
      </Section>

      <Section title="2. Eligibility and authority">
        <p>
          You must be at least 18 years old and legally capable of entering a contract. If you act for a
          business, agency, client or other organization, you confirm that you are authorized to bind it and to
          submit every target account, profile, post or URL used in an order.
        </p>
      </Section>

      <Section title="3. Nature of the Service">
        <p>
          FlexiPro provides prepaid digital promotion and campaign-delivery services for supported social-media
          platforms. Service descriptions, quantities, estimated timing, refill or retention periods and prices
          shown at checkout are part of the order. We do not own, control or represent any social-media platform
          and are not endorsed by them.
        </p>
        <p>
          Do not describe purchased metrics as organic audience demand, verified customer sentiment or
          independent endorsement. FlexiPro does not guarantee monetization, ranking, reach, sales, revenue,
          permanent retention, account safety or compliance with any third-party platform.
        </p>
      </Section>

      <Section title="4. Account security">
        <Bullets
          items={[
            "Provide accurate registration information and keep it current.",
            "Protect your password and API key; notify support promptly of suspected compromise.",
            "FlexiPro should never request your social-media password. Do not provide one.",
            "You are responsible for authorized activity under your account until you notify us of unauthorized access.",
          ]}
        />
      </Section>

      <Section title="5. Wallet, UPI and cryptocurrency funding">
        <p>
          Wallet funds are prepaid credits used to buy Services; they are not a bank account, deposit, security,
          stored-value product transferable between users, or investment. Minimum deposits, supported payment
          routes, fees and exchange-rate treatment are displayed before payment.
        </p>
        <p>
          UPI deposits may require a valid transaction reference and verification by the payment provider.
          Crypto deposits are credited only after the stated network confirmations. You are responsible for
          selecting the exact supported asset and network and for network fees. Transfers to an unsupported
          asset, network or address may be unrecoverable, and FlexiPro cannot promise recovery where recovery is
          technically impossible.
        </p>
      </Section>

      <Section title="6. Orders">
        <Bullets
          items={[
            "Review the target URL, account visibility, service, quantity, estimated start and price before submission.",
            "An order may not be cancellable after processing begins. The dashboard displays whether cancellation remains available.",
            "Do not place overlapping orders for the same metric and target while a prior order is active; measurement may become unreliable.",
            "Keep the target public and unchanged for the delivery period when the service requires public access.",
            "Order status, completion and delivered quantity may reflect third-party measurement delays or adjustments.",
          ]}
        />
      </Section>

      <Section title="7. Acceptable and ethical use">
        <p>
          You must comply with our Ethical Use and Acceptable Use Policy. Prohibited uses include bots or fake
          identities used to misrepresent commercial influence, fake reviews or testimonials, deceptive political
          or public-interest manipulation, harassment, impersonation, fraud, illegal content, unauthorized
          targets, platform abuse, credential collection and attempts to evade enforcement.
        </p>
      </Section>

      <Section title="8. Third-party platforms">
        <p>
          Each social-media platform sets its own terms and enforcement rules. Your use of FlexiPro may be
          restricted by those rules. Platforms may remove engagement, restrict reach, suspend accounts, withhold
          monetization or change their systems without notice. You accept this independent third-party risk;
          however, nothing in these Terms excludes remedies that applicable consumer law requires.
        </p>
      </Section>

      <Section title="9. Prices, tax and records">
        <p>
          Prices may change prospectively. The price confirmed at order submission applies to that order. The
          checkout shows whether tax is included, and a transaction/order record is issued for each purchase. You
          are responsible for taxes imposed on your use except taxes imposed on FlexiPro's income.
        </p>
      </Section>

      <Section title="10. Refunds and service remedies">
        <p>
          The Refund Policy is incorporated into these Terms. In summary: verified duplicate or failed wallet
          deposits may qualify for return to the original payment method; a failed or partially undelivered order
          ordinarily qualifies for re-delivery or a proportional wallet credit. Delivered portions are not
          refundable merely because results later change, subject always to mandatory law.
        </p>
      </Section>

      <Section title="11. Availability and changes">
        <p>
          We may maintain, modify or discontinue a Service when suppliers, platforms, law, safety or technical
          conditions change. We will not materially reduce an already-paid order without providing the remedy
          stated in the Refund Policy. Estimates are not guaranteed deadlines unless expressly labelled
          guaranteed.
        </p>
      </Section>

      <Section title="12. Intellectual property and feedback">
        <p>
          FlexiPro and its licensors own the Service software, branding and original content. We grant you a
          limited, revocable, non-transferable right to use the Service for its intended purpose. You retain
          ownership of information you submit and grant us only the rights needed to process orders, prevent
          abuse and provide support. Feedback may be used without obligation, but we will not publicly identify
          you without permission.
        </p>
      </Section>

      <Section title="13. Suspension and termination">
        <p>
          We may restrict or suspend an account when reasonably necessary for security, fraud prevention, legal
          compliance, payment disputes, API abuse or material breach. Where lawful and safe, we will explain the
          reason and offer an appeal. We will not automatically forfeit an unused wallet balance merely because
          an account is closed; lawful deductions, fraud holds and non-refundable consumed services may apply.
          Eligible remaining funds are handled under the Refund Policy.
        </p>
      </Section>

      <Section title="14. Disclaimers">
        <p>
          To the extent permitted by law, the Service is provided "as available". We do not warrant uninterrupted
          operation, permanent engagement, a particular algorithmic outcome, monetization or business results.
          These disclaimers do not limit non-waivable consumer rights or liability that law does not permit us to
          exclude.
        </p>
      </Section>

      <Section title="15. Liability">
        <p>
          To the extent permitted by law, neither party is liable for indirect, special or consequential loss
          that was not reasonably foreseeable. FlexiPro's aggregate liability arising from the Service will not
          exceed the greater of the amount you paid for the affected order or the amount paid by you during the
          three months before the event giving rise to the claim. This limit does not apply to fraud, willful
          misconduct, breach of confidentiality, infringement, or liability that cannot legally be limited.
        </p>
      </Section>

      <Section title="16. Disputes and governing law">
        <p>
          These Terms are governed by the laws of the State of Delaware and applicable United States federal law,
          without regard to conflicts rules. Before filing a claim, contact{" "}
          <a className="text-orange-500 hover:underline" href="mailto:flexipro.support@gmail.com">
            flexipro.support@gmail.com
          </a>{" "}
          and allow 30 days for good-faith resolution.
        </p>
      </Section>

      <Section title="17. Changes and contact">
        <p>
          We may update these Terms prospectively. Material changes will be notified in the dashboard or by email
          before they take effect where reasonably possible, and the effective date will be updated. Questions:{" "}
          <a className="text-orange-500 hover:underline" href="mailto:flexipro.support@gmail.com">
            flexipro.support@gmail.com
          </a>
          , FlexiPro LLC, 8 The Green, Suite #14490, Dover, Delaware 19901, USA.
        </p>
      </Section>
    </LegalLayout>
  );
}
