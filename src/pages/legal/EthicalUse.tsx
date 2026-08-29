import { LegalLayout, Section, Bullets } from "@/components/legal/LegalLayout";

export default function EthicalUse() {
  return (
    <LegalLayout
      title="Ethical Use and Acceptable Use Policy"
      metaTitle="Ethical Use Policy | FlexiPro"
      description="Prohibited manipulation, deceptive influence and harmful use of FlexiPro services, plus how we enforce these rules."
      canonicalPath="/ethical-use"
      breadcrumbLabel="Ethical Use"
      effectiveDate="29 August 2026"
      summary={
        <p>
          <strong className="text-foreground">Core rule:</strong> FlexiPro must not be used to deceive people
          about genuine popularity, customer experience, political support, public opinion, authority or
          commercial influence.
        </p>
      }
    >
      <Section title="Required user promises">
        <Bullets
          items={[
            "You own or are authorized to promote every target.",
            "You will not describe paid or promotional engagement as independent customer opinion or verified organic demand.",
            "You will comply with applicable law, advertising disclosure rules and platform rules.",
            "You will not use engagement to qualify deceptively for monetization, awards, ranking, verification, financing or commercial contracts.",
            "You will not request comments or endorsements that claim a personal experience the speaker did not have.",
          ]}
        />
      </Section>

      <Section title="Prohibited uses">
        <Bullets
          items={[
            "Bots, fake accounts, hijacked accounts or stolen identities used as engagement indicators.",
            "Fake reviews, testimonials, ratings or undisclosed endorsements.",
            "Election, political, civic, health, financial or emergency misinformation; coordinated inauthentic behavior; astroturfing.",
            "Harassment, hate, threats, sexual exploitation, child endangerment, self-harm promotion or illegal goods and services.",
            "Impersonation, fraud, phishing, credential theft, malware, spam or privacy invasion.",
            "Promotion of an account or content without the owner's authorization.",
            "Circumventing platform enforcement, rate limits, access controls, bans or detection systems.",
            "Scraping or API use that violates law or rights; resale without written authorization.",
          ]}
        />
      </Section>

      <Section title="Enforcement">
        <p>
          We may reject, pause, cancel or report orders that reasonably appear unlawful, deceptive or harmful,
          and we may request proof of authorization. Where safe and lawful, we provide a reason and an appeal
          route. Payments for rejected, unprocessed orders are returned to your wallet or handled under the
          Refund Policy. Serious threats or illegal activity may be preserved and reported as law requires.
        </p>
      </Section>
    </LegalLayout>
  );
}
