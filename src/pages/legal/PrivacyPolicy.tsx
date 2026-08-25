import { Link } from "@/lib/router-compat";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageMeta } from "@/components/seo/PageMeta";

export default function PrivacyPolicy() {
  return (
    <>
      <PageMeta title="Privacy Policy | FlexiPro" description="Learn how FlexiPro collects, uses, and protects your personal data." canonicalPath="/privacy" breadcrumbs={[{ name: "Home", path: "/" }, { name: "Privacy Policy", path: "/privacy" }]} />
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Link to="/">
            <Button variant="ghost" size="sm" className="mb-8 gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Button>
          </Link>

          <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: February 10, 2026</p>

          <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">1. Introduction</h2>
              <p>FlexiPro ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform and services. Please read this policy carefully to understand our practices regarding your personal data.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">2. Information We Collect</h2>
              <p><strong className="text-foreground">Personal Information:</strong> When you create an account, we collect your name, email address, and other information you provide during registration.</p>
              <p><strong className="text-foreground">Payment Information:</strong> We collect payment details necessary to process transactions. Payment data is processed through secure, PCI-compliant payment processors and is not stored on our servers.</p>
              <p><strong className="text-foreground">Usage Data:</strong> We automatically collect information about how you interact with our Platform, including IP addresses, browser type, device information, pages visited, and timestamps.</p>
              <p><strong className="text-foreground">Order Data:</strong> We collect information related to your service orders, including social media URLs, quantities, and delivery preferences.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">3. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Provide, maintain, and improve our services</li>
                <li>Process transactions and send related information</li>
                <li>Send administrative notifications, such as order updates and support responses</li>
                <li>Monitor and analyze usage patterns to improve user experience</li>
                <li>Detect, prevent, and address technical issues, fraud, and security threats</li>
                <li>Comply with legal obligations and enforce our Terms of Service</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">4. Data Security</h2>
              <p>We implement industry-standard security measures to protect your personal information, including:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>SSL/TLS encryption for all data in transit</li>
                <li>Encrypted storage for sensitive data at rest</li>
                <li>Row Level Security (RLS) policies on all database tables</li>
                <li>Regular security audits and vulnerability assessments</li>
                <li>Access controls limiting data access to authorized personnel only</li>
              </ul>
              <p>While we strive to protect your information, no method of electronic transmission or storage is 100% secure. We cannot guarantee absolute security.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">5. Data Sharing & Disclosure</h2>
              <p>We do not sell, trade, or rent your personal information to third parties. We may share your information in the following circumstances:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong className="text-foreground">Service Providers:</strong> With third-party service providers who assist us in operating the Platform (e.g., payment processors, hosting providers)</li>
                <li><strong className="text-foreground">Legal Requirements:</strong> When required by law, court order, or governmental authority</li>
                <li><strong className="text-foreground">Protection of Rights:</strong> To protect our rights, privacy, safety, or property, and that of our users and the public</li>
                <li><strong className="text-foreground">Business Transfers:</strong> In connection with any merger, acquisition, or sale of assets</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">6. Cookies & Tracking Technologies</h2>
              <p>We use cookies and similar tracking technologies to enhance your experience. These include:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong className="text-foreground">Essential Cookies:</strong> Required for Platform functionality, such as authentication and session management</li>
                <li><strong className="text-foreground">Analytics Cookies:</strong> Help us understand how visitors interact with our Platform</li>
                <li><strong className="text-foreground">Preference Cookies:</strong> Remember your settings and preferences</li>
              </ul>
              <p>You can control cookies through your browser settings. Disabling certain cookies may affect Platform functionality.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">7. Data Retention</h2>
              <p>We retain your personal data for as long as your account is active or as needed to provide services. We may retain certain information after account closure for legitimate business purposes, legal compliance, dispute resolution, and enforcement of our agreements. Anonymized or aggregated data may be retained indefinitely.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">8. Your Rights</h2>
              <p>Depending on your jurisdiction, you may have the following rights:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong className="text-foreground">Access:</strong> Request a copy of the personal data we hold about you</li>
                <li><strong className="text-foreground">Correction:</strong> Request correction of inaccurate or incomplete data</li>
                <li><strong className="text-foreground">Deletion:</strong> Request deletion of your personal data, subject to legal retention requirements</li>
                <li><strong className="text-foreground">Portability:</strong> Request your data in a structured, machine-readable format</li>
                <li><strong className="text-foreground">Objection:</strong> Object to processing of your personal data for certain purposes</li>
              </ul>
              <p>To exercise any of these rights, please contact us through our Support page.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">9. Children's Privacy</h2>
              <p>Our Platform is not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected data from a child, we will take steps to delete it promptly.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">10. Changes to This Policy</h2>
              <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page with an updated "Last updated" date. Your continued use of the Platform after changes constitutes acceptance of the revised policy.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">11. Contact Us</h2>
              <p>If you have questions or concerns about this Privacy Policy or our data practices, please contact us through our Support page or email us at privacy@flexipro.com.</p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
