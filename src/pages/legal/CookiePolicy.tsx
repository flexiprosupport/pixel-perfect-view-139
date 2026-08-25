import { Link } from "@/lib/router-compat";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageMeta } from "@/components/seo/PageMeta";

export default function CookiePolicy() {
  return (
    <>
      <PageMeta title="Cookie Policy | Extips Panel" description="Learn about how Extips Panel uses cookies and similar technologies." canonicalPath="/cookies" breadcrumbs={[{ name: "Home", path: "/" }, { name: "Cookie Policy", path: "/cookies" }]} />
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Link to="/">
            <Button variant="ghost" size="sm" className="mb-8 gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Button>
          </Link>

          <h1 className="text-3xl font-bold mb-2">Cookie Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: February 10, 2026</p>

          <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">1. What Are Cookies</h2>
              <p>Cookies are small text files that are stored on your device (computer, tablet, or mobile) when you visit a website. They are widely used to make websites work more efficiently and to provide information to website owners. Cookies help us remember your preferences and improve your experience on our Platform.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">2. How We Use Cookies</h2>
              <p>Extips Panel uses cookies and similar technologies for the following purposes:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong className="text-foreground">Authentication:</strong> To identify you when you log in and maintain your session securely</li>
                <li><strong className="text-foreground">Security:</strong> To protect your account from unauthorized access and detect suspicious activity</li>
                <li><strong className="text-foreground">Preferences:</strong> To remember your settings, such as theme preferences and language</li>
                <li><strong className="text-foreground">Analytics:</strong> To understand how visitors interact with our Platform and identify areas for improvement</li>
                <li><strong className="text-foreground">Performance:</strong> To optimize Platform speed and reliability by caching frequently accessed data</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">3. Types of Cookies We Use</h2>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-foreground">Essential Cookies</h3>
                  <p>These cookies are strictly necessary for the Platform to function. They enable core features such as user authentication, session management, and security protections. Without these cookies, the Platform cannot operate properly. These cookies cannot be disabled.</p>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-foreground">Functional Cookies</h3>
                  <p>These cookies allow the Platform to remember your choices and provide enhanced, personalized features. For example, they may remember your display preferences or the state of your dashboard layout.</p>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-foreground">Analytics Cookies</h3>
                  <p>These cookies collect information about how you use the Platform, such as which pages you visit most often. This data helps us understand user behavior and improve our services. All analytics data is aggregated and anonymized.</p>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">4. Third-Party Cookies</h2>
              <p>We may use third-party services that set their own cookies on your device. These include:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong className="text-foreground">Payment Processors:</strong> For secure transaction processing</li>
                <li><strong className="text-foreground">Analytics Providers:</strong> For aggregated usage statistics</li>
              </ul>
              <p>We do not control these third-party cookies. Please refer to the respective third-party privacy policies for more information about their cookie practices.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">5. Managing Cookies</h2>
              <p>You can control and manage cookies through your browser settings. Most browsers allow you to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>View and delete existing cookies</li>
                <li>Block cookies from specific or all websites</li>
                <li>Set preferences for certain types of cookies</li>
                <li>Receive notifications when a cookie is set</li>
              </ul>
              <p>Please note that disabling essential cookies may prevent you from using certain features of the Platform, including logging in to your account.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">6. Local Storage</h2>
              <p>In addition to cookies, we use browser local storage to maintain your authentication session and store certain preferences. Local storage functions similarly to cookies but can store larger amounts of data. The same privacy protections apply to data stored in local storage.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">7. Data Retention</h2>
              <p>Session cookies are temporary and are deleted when you close your browser. Persistent cookies remain on your device for a set period or until you manually delete them. Authentication tokens are refreshed automatically and expire based on security policies.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">8. Changes to This Policy</h2>
              <p>We may update this Cookie Policy from time to time to reflect changes in technology, legislation, or our business practices. Any changes will be posted on this page with an updated "Last updated" date.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">9. Contact Us</h2>
              <p>If you have any questions about our use of cookies, please contact us through our Support page or email us at privacy@extipspanel.com.</p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
