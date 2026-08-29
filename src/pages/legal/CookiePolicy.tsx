import { LegalLayout, Section, Bullets, DataTable } from "@/components/legal/LegalLayout";

export default function CookiePolicy() {
  return (
    <LegalLayout
      title="Cookie Policy"
      metaTitle="Cookie Policy | FlexiPro"
      description="Cookie and local-storage categories used by FlexiPro and how you can control them."
      canonicalPath="/cookies"
      breadcrumbLabel="Cookie Policy"
      effectiveDate="29 August 2026"
    >
      <Section title="1. What these technologies are">
        <p>
          Cookies and local-storage items are small identifiers stored on your device. FlexiPro uses strictly
          necessary items for sign-in, session security, wallet and order workflows, and fraud prevention.
          Optional analytics or marketing technologies do not load until any required consent is obtained.
        </p>
      </Section>

      <Section title="2. Categories we use">
        <Bullets
          items={[
            <><strong className="text-foreground">Necessary:</strong> authentication, session continuity, CSRF and fraud protection. These cannot be disabled without breaking sign-in.</>,
            <><strong className="text-foreground">Functional:</strong> remembering preferences such as theme, currency and dashboard layout.</>,
            <><strong className="text-foreground">Analytics:</strong> aggregated usage measurement, loaded only where consent rules allow.</>,
          ]}
        />
      </Section>

      <Section title="3. Cookie register">
        <DataTable
          head={["Name / provider", "Purpose", "Category", "Duration"]}
          rows={[
            ["sb-*-auth-token (Supabase auth)", "Authentication and session", "Necessary", "Session / until sign-out"],
            ["flexipro-preferences", "Theme, currency and layout preferences", "Functional", "12 months"],
            ["Security / anti-fraud identifiers", "CSRF and abuse prevention", "Necessary", "Up to 24 hours"],
          ]}
        />
      </Section>

      <Section title="4. Third-party technologies">
        <p>
          Payment providers and infrastructure providers may set their own identifiers when you complete a
          deposit or load the dashboard. We do not control those identifiers; please review the relevant
          provider's own privacy notice.
        </p>
      </Section>

      <Section title="5. Your controls">
        <Bullets
          items={[
            "You can reject optional cookies as easily as accepting them, and change that choice at any time.",
            "Browsers let you view, delete and block cookies, and notify you when one is set.",
            "Blocking necessary cookies or local storage will prevent sign-in and order placement.",
          ]}
        />
      </Section>

      <Section title="6. Local storage">
        <p>
          In addition to cookies, we use browser local storage to maintain your authenticated session and store
          certain preferences. The same privacy protections described in the Privacy Policy apply.
        </p>
      </Section>

      <Section title="7. Changes and contact">
        <p>
          We update this policy when our technology or providers change. Questions:{" "}
          <a className="text-orange-500 hover:underline" href="mailto:flexipro.support@gmail.com">
            flexipro.support@gmail.com
          </a>
          .
        </p>
      </Section>
    </LegalLayout>
  );
}
