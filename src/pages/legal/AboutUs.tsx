import { Sparkles, Users, Shield, Zap } from "lucide-react";
import { LegalLayout, Section, Bullets } from "@/components/legal/LegalLayout";

const highlights = [
  { icon: Sparkles, title: "Clear pricing", text: "Full price and material limitations shown before you order." },
  { icon: Shield, title: "No password needed", text: "We only need a supported public URL or username." },
  { icon: Zap, title: "Tracked delivery", text: "Order status and delivered quantity visible in the dashboard." },
  { icon: Users, title: "Fair remedies", text: "Confirmed non-delivery gets re-delivery or wallet credit." },
];

export default function AboutUs() {
  return (
    <LegalLayout
      title="About FlexiPro"
      metaTitle="About Us | FlexiPro"
      description="FlexiPro LLC is a Delaware company providing prepaid digital campaign-management and promotional-delivery tools."
      canonicalPath="/about"
      breadcrumbLabel="About Us"
      subtitle="Prepaid digital campaign tools for creators, businesses and agencies."
    >
      <Section title="Who we are">
        <p>
          FlexiPro is operated by FlexiPro LLC, a Delaware company providing prepaid digital campaign-management
          and promotional-delivery tools for creators, businesses and agencies. Our dashboard helps customers
          configure supported campaigns, view estimated delivery, track order status and contact support.
        </p>
        <p>
          We believe customers deserve clear prices, realistic delivery estimates, honest limitations and fair
          remedies when a confirmed service is not delivered. FlexiPro is independent and is not affiliated with
          or endorsed by Instagram, Meta, YouTube, Google, TikTok or other social platforms.
        </p>
      </Section>

      <div className="grid sm:grid-cols-2 gap-4">
        {highlights.map((f) => (
          <div key={f.title} className="rounded-xl border border-border p-5 bg-card">
            <f.icon className="h-6 w-6 text-orange-500 mb-2" />
            <h3 className="font-semibold text-foreground mb-1">{f.title}</h3>
            <p className="text-sm">{f.text}</p>
          </div>
        ))}
      </div>

      <Section title="What we do">
        <Bullets
          items={[
            "Prepaid wallet funding through supported UPI and cryptocurrency routes.",
            "Digital campaign ordering and status tracking.",
            "Service-specific pacing and delivery estimates.",
            "API access for approved business users.",
            "Customer support for payment, order and technical issues.",
          ]}
        />
      </Section>

      <Section title="What we do not promise">
        <Bullets
          items={[
            "We do not guarantee permanent metrics, monetization, ranking, revenue or protection from platform enforcement.",
            "We do not need your social-media password.",
            "Paid or promotional engagement must not be represented as independent organic demand.",
          ]}
        />
      </Section>

      <Section title="Business information">
        <p>
          <strong className="text-foreground">Business:</strong> FlexiPro LLC<br />
          <strong className="text-foreground">Registered address:</strong> 8 The Green, Suite #14490, Dover, DE
          19901, United States<br />
          <strong className="text-foreground">Email:</strong>{" "}
          <a className="text-orange-500 hover:underline" href="mailto:flexipro.support@gmail.com">
            flexipro.support@gmail.com
          </a>
          <br />
          <strong className="text-foreground">WhatsApp / phone:</strong> +1 (367) 828-8027<br />
          <strong className="text-foreground">Website:</strong> https://flexipro.in/
        </p>
      </Section>
    </LegalLayout>
  );
}
