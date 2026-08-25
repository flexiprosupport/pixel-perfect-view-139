import { Link } from "@/lib/router-compat";
import { ArrowLeft, Sparkles, Users, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageMeta } from "@/components/seo/PageMeta";

export default function AboutUs() {
  return (
    <>
      <PageMeta
        title="About Us | Extips Panel"
        description="Extips Panel is an Indian digital social media growth platform providing organic, natural delivery patterns for creators and businesses."
        canonicalPath="/about"
        breadcrumbs={[{ name: "Home", path: "/" }, { name: "About Us", path: "/about" }]}
      />
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Link to="/">
            <Button variant="ghost" size="sm" className="mb-8 gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Button>
          </Link>

          <h1 className="text-3xl font-bold mb-2">About Extips Panel</h1>
          <p className="text-muted-foreground mb-8">
            India's trusted organic social media growth platform.
          </p>

          <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">Who We Are</h2>
              <p>
                Extips Panel is a Delaware, USA based digital marketing platform that helps creators, small businesses and agencies grow their social media presence through natural, organic-style engagement delivery. We serve customers across the United States and globally with reliable, transparent and affordable digital promotion services.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">What We Offer</h2>
              <p>We provide digital services including:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Organic-pattern social media engagement (followers, likes, views, comments)</li>
                <li>Multi-platform support (Instagram, YouTube, Facebook, Twitter/X, TikTok and more)</li>
                <li>Scheduled organic delivery to mimic natural growth patterns</li>
                <li>Wallet-based prepaid system with secure payments</li>
                <li>API access for resellers and agencies</li>
                <li>24/7 live chat and email support</li>
              </ul>
            </section>

            <div className="grid sm:grid-cols-2 gap-4 not-prose">
              {[
                { icon: Sparkles, title: "Organic Growth", text: "Natural delivery patterns, not bot-like bursts." },
                { icon: Shield, title: "Secure & Safe", text: "SSL secured platform, no password ever required." },
                { icon: Zap, title: "Fast Delivery", text: "Most orders start within minutes of placement." },
                { icon: Users, title: "Trusted by Thousands", text: "Creators and agencies across India trust us." },
              ].map((f) => (
                <div key={f.title} className="rounded-xl border border-border p-5 bg-card">
                  <f.icon className="h-6 w-6 text-orange-500 mb-2" />
                  <h3 className="font-semibold text-foreground mb-1">{f.title}</h3>
                  <p className="text-sm">{f.text}</p>
                </div>
              ))}
            </div>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">Our Mission</h2>
              <p>
                To make professional-grade social media growth tools accessible and affordable for every creator and small business worldwide — with full transparency, fair pricing and reliable customer support.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">Business Information</h2>
              <p>
                <strong className="text-foreground">Brand Name:</strong> Extips Panel<br />
                
                <strong className="text-foreground">Registered Address:</strong> 8 The Green, Suite #14490, Dover, DE 19901, United States<br />
                <strong className="text-foreground">Email:</strong> support@extipspanel.com<br />
                <strong className="text-foreground">WhatsApp / Phone:</strong> +1 (367) 828-8027<br />
                <strong className="text-foreground">Website:</strong> https://extipspanel.com
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}