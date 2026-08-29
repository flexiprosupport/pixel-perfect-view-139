import { LegalLayout, Section, Bullets, DataTable } from "@/components/legal/LegalLayout";

export default function PrivacyPolicy() {
  return (
    <LegalLayout
      title="Privacy Policy"
      metaTitle="Privacy Policy | FlexiPro"
      description="How FlexiPro LLC collects, uses, shares, retains and protects personal information."
      canonicalPath="/privacy"
      breadcrumbLabel="Privacy Policy"
      effectiveDate="29 August 2026"
    >
      <Section title="1. Scope and controller">
        <p>
          This Privacy Policy explains how FlexiPro LLC processes personal information when you visit
          flexipro.in, create an account, fund a wallet, submit an order, use the API or contact support.
          FlexiPro LLC is the controller/business for this processing unless another notice says otherwise.
        </p>
      </Section>

      <Section title="2. Information collected">
        <Bullets
          items={[
            <><strong className="text-foreground">Account data:</strong> name, email, hashed authentication credentials, account status and preferences.</>,
            <><strong className="text-foreground">Order data:</strong> target URLs/usernames, selected service, quantity, timing, status, delivery measurements and support history.</>,
            <><strong className="text-foreground">Payment data:</strong> UPI transaction reference, amount, payer/provider status, crypto wallet transaction/address and network confirmation data. We do not accept or store card data.</>,
            <><strong className="text-foreground">Device and log data:</strong> IP address, browser/device type, timestamps, referral URL, security events and API request metadata.</>,
            <><strong className="text-foreground">Communications:</strong> tickets, email, WhatsApp/live-chat messages and attachments you choose to send.</>,
            <><strong className="text-foreground">Cookies/local storage:</strong> session, security and preference identifiers; analytics only where actually deployed and consented to where required.</>,
          ]}
        />
      </Section>

      <Section title="3. Purposes and legal bases">
        <Bullets
          items={[
            "Provide accounts, wallets, orders, delivery tracking and support (contract).",
            "Prevent fraud, secure accounts, troubleshoot and improve reliability (legitimate interests and legal obligations).",
            "Process payments, keep tax/accounting records and respond to lawful requests (contract/legal obligation).",
            "Send service messages (contract). Marketing messages require consent or another lawful basis and always include opt-out.",
            "Analyze performance using minimized or aggregated data (legitimate interests, or consent where required).",
          ]}
        />
      </Section>

      <Section title="4. Sharing">
        <p>
          We share only what is reasonably necessary with hosting/database providers, authentication providers,
          UPI/payment providers, blockchain networks, service fulfilment providers, email/chat/support providers,
          analytics providers, professional advisers, fraud/security vendors and authorities when legally
          required. We do not sell personal information.
        </p>
      </Section>

      <Section title="5. International transfers">
        <p>
          Information may be processed in the United States, India and countries where contracted providers
          operate. Where required, we use an appropriate transfer mechanism and safeguards. You may contact us
          for information about applicable safeguards.
        </p>
      </Section>

      <Section title="6. Retention">
        <DataTable
          head={["Data", "Schedule"]}
          rows={[
            ["Account profile", "Account life + 30 days; a minimal suppression/security record may be retained"],
            ["Orders and payment records", "Up to 7 years where required for tax, accounting, fraud and disputes"],
            ["Support tickets", "24 months after closure"],
            ["Security/API logs", "12 months, longer only for an active investigation"],
            ["Marketing consent", "Until withdrawal, plus the evidence period required by law"],
            ["Cookie identifiers", "Per the cookie register on the Cookie Policy page"],
          ]}
        />
      </Section>

      <Section title="7. Security">
        <p>
          We use access controls, transport encryption, credential hashing, logging, least-privilege access,
          backups and incident-response procedures appropriate to risk. No system is perfectly secure, and we do
          not claim protections we cannot continuously maintain.
        </p>
      </Section>

      <Section title="8. Rights and choices">
        <p>
          Depending on your location, you may request access, correction, deletion, restriction, objection,
          portability, withdrawal of consent or appeal of a privacy decision. Email{" "}
          <a className="text-orange-500 hover:underline" href="mailto:flexipro.support@gmail.com">
            flexipro.support@gmail.com
          </a>{" "}
          with the subject "Privacy Request". We may verify your identity and may retain information where law
          permits or requires. You may also complain to your local data-protection authority.
        </p>
      </Section>

      <Section title="9. US state disclosures">
        <p>
          FlexiPro does not sell personal information or share it for cross-context behavioral advertising as
          those terms are defined by applicable US state privacy laws. We do not knowingly process sensitive
          personal information to infer characteristics. If practices change, we will provide the required
          opt-out mechanisms before the change takes effect.
        </p>
      </Section>

      <Section title="10. Children">
        <p>
          The Service is for adults aged 18 or older. We do not knowingly collect children's personal
          information. Contact us if you believe a child provided data so we can investigate and delete it where
          required.
        </p>
      </Section>

      <Section title="11. Changes and contact">
        <p>
          We will post updates with a new effective date and give additional notice for material changes where
          required. Contact:{" "}
          <a className="text-orange-500 hover:underline" href="mailto:flexipro.support@gmail.com">
            flexipro.support@gmail.com
          </a>
          , FlexiPro LLC, 8 The Green, Suite #14490, Dover, DE 19901, USA.
        </p>
      </Section>
    </LegalLayout>
  );
}
