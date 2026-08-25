import { Link } from "@/lib/router-compat";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageMeta } from "@/components/seo/PageMeta";

export default function TermsOfService() {
  return (
    <>
      <PageMeta title="Terms of Service | FlexiPro" description="Read the Terms of Service for FlexiPro platform." canonicalPath="/terms" breadcrumbs={[{ name: "Home", path: "/" }, { name: "Terms of Service", path: "/terms" }]} />
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Link to="/"><Button variant="ghost" size="sm" className="mb-8 gap-2"><ArrowLeft className="h-4 w-4" /> Back to Home</Button></Link>

          <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Last updated: February 22, 2026</p>

          {/* Important notice box */}
          <div className="flex gap-3 p-4 mb-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400/90">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="text-sm leading-relaxed">
              <strong className="text-amber-400">Important:</strong> By accessing or using FlexiPro, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. If you do not agree, you must immediately cease using the Platform.
            </p>
          </div>

          <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
              <p>By accessing or using FlexiPro ("the Platform," "we," "us," or "our"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you must not use our services. These Terms constitute a legally binding agreement between you ("User," "you," or "your") and FlexiPro. Your use of this Platform constitutes your full, unconditional acceptance of these Terms.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">2. Nature of Services — Digital Services Disclaimer</h2>
              <p>FlexiPro provides <strong className="text-foreground">digital social media engagement services</strong> — including but not limited to views, likes, comments, followers, and other engagement metrics across social media platforms. By their very nature, these are <strong className="text-foreground">intangible digital services</strong> that are delivered electronically and consumed immediately upon delivery.</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Digital services cannot be "returned" once delivered</li>
                <li>Engagement metrics are subject to natural fluctuation on third-party platforms</li>
                <li>We use proprietary algorithms to deliver organic-pattern engagement</li>
                <li>Results depend partly on third-party platform conditions beyond our control</li>
                <li>We make no guarantee of permanent retention of delivered engagement</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">3. Eligibility</h2>
              <p>You must be at least 18 years of age to use this Platform. By using our services, you represent and warrant that you are of legal age to form a binding contract and meet all eligibility requirements. If you are using the Platform on behalf of a business entity, you represent that you have authority to bind that entity to these Terms.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">4. Account Registration</h2>
              <p>To access our services, you must create an account by providing accurate, complete, and current information. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You agree to notify us immediately of any unauthorized use of your account.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">5. Subscription & Payment</h2>
              <p>Access to our services requires an active subscription. Subscription plans and pricing are displayed on the Platform. Payments are processed through secure payment gateways. All fees are non-refundable except as expressly stated in our Refund Policy. You agree to pay all charges associated with your account at the prices in effect when such charges are incurred.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">6. Wallet System</h2>
              <p>Our Platform uses an internal wallet system for transactions. Funds added to your wallet are used to pay for services. Wallet balances are non-transferable between accounts. We reserve the right to freeze wallet balances in cases of suspected fraud or Terms violations.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">7. Chargeback & Payment Dispute Policy</h2>
              <div className="p-4 rounded-xl bg-red-500/8 border border-red-500/15 space-y-2">
                <p className="text-foreground font-semibold">IMPORTANT — Please read carefully:</p>
                <p>By making a payment to FlexiPro, you explicitly agree that:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong className="text-foreground">Initiating a chargeback</strong> or payment dispute with your bank/card issuer without first contacting us and giving us the opportunity to resolve your issue constitutes a breach of these Terms</li>
                  <li>You acknowledge that our services are <strong className="text-foreground">digital, non-tangible</strong> and are consumed upon delivery, making chargebacks inappropriate under most payment network rules</li>
                  <li>Fraudulent chargebacks will be vigorously contested with full transaction records, delivery logs, and IP evidence submitted to the payment processor</li>
                  <li>In the event of a fraudulent chargeback, we reserve the right to permanently ban your account, report abuse to relevant platforms, and pursue legal remedies</li>
                  <li>You must obtain a written response from us within 5 business days before initiating any payment dispute</li>
                </ul>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">8. Acceptable Use Policy</h2>
              <p>You agree not to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Use our services for any unlawful purpose or in violation of any applicable laws</li>
                <li>Provide false, misleading, or inaccurate information</li>
                <li>Attempt to gain unauthorized access to our systems or other users' accounts</li>
                <li>Use automated tools, bots, or scripts to interact with the Platform without authorization</li>
                <li>Resell or redistribute our services without prior written consent</li>
                <li>Interfere with or disrupt the Platform's infrastructure</li>
                <li>Use our services to violate any third-party platform's terms of service</li>
                <li>Initiate fraudulent payment disputes or chargebacks</li>
                <li>Use the Platform for any activity that may constitute a criminal offense in your jurisdiction</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">9. User Responsibility & Legal Compliance</h2>
              <p>By using FlexiPro, you acknowledge and agree that:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>You are solely responsible for ensuring that your use of our services complies with all applicable laws and regulations in your jurisdiction</li>
                <li>You use our services at your own risk regarding compliance with third-party social media platform policies</li>
                <li>FlexiPro is not responsible for any action taken by social media platforms against your account as a result of your use of our services</li>
                <li>You will not hold FlexiPro liable for any legal consequences arising from your use of our services</li>
                <li>Social media engagement services operate in a dynamic environment, and we make no guarantees about permanent results</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">10. Service Delivery</h2>
              <p>We strive to deliver services within estimated timeframes but do not guarantee exact delivery times. Delivery speeds vary based on order volume, service type, and third-party platform conditions. We are not liable for delays caused by factors beyond our control, including but not limited to third-party platform changes or outages.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">11. No Guarantee of Results</h2>
              <p>While we make every effort to deliver services as described, we explicitly do not guarantee:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Permanent retention of delivered engagement (e.g., followers may unfollow, views may decay)</li>
                <li>Any specific business outcome, revenue, or growth as a result of our services</li>
                <li>That our services will meet your specific expectations in every case</li>
                <li>Uninterrupted or error-free service delivery at all times</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">12. Intellectual Property</h2>
              <p>All content, features, and functionality of the Platform—including but not limited to text, graphics, logos, icons, software, and algorithms—are the exclusive property of FlexiPro and are protected by international copyright, trademark, and other intellectual property laws.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">13. Limitation of Liability</h2>
              <p>To the maximum extent permitted by law, FlexiPro shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Loss of profits, revenue, or business opportunities</li>
                <li>Loss of data or account access on third-party platforms</li>
                <li>Actions taken by social media platforms against user accounts</li>
                <li>Any claims arising from user's violation of third-party platform terms</li>
                <li>Any indirect results of social media engagement delivered</li>
              </ul>
              <p>Our total liability shall not exceed the amount paid by you in the 3 months preceding the claim.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">14. Disclaimer of Warranties</h2>
              <p>Our services are provided "as is" and "as available" without warranties of any kind, whether express or implied. We do not warrant that services will be uninterrupted, error-free, or that results will meet your expectations. We disclaim all warranties, including merchantability, fitness for a particular purpose, and non-infringement.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">15. Indemnification</h2>
              <p>You agree to indemnify, defend, and hold harmless FlexiPro and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses arising from:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Your use of the Platform or violation of these Terms</li>
                <li>Your violation of any rights of a third party</li>
                <li>Your violation of any applicable laws or regulations</li>
                <li>Any fraudulent payment disputes or chargebacks you initiate</li>
                <li>Any claim by a social media platform relating to your use of our services</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">16. Termination</h2>
              <p>We reserve the right to suspend or terminate your account at any time, with or without notice, for conduct that we determine violates these Terms, is harmful to other users, or is otherwise objectionable. Upon termination, your right to use the Platform will immediately cease. Any unused wallet balance at the time of termination for ToS violations is forfeited.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">17. Governing Law & Dispute Resolution</h2>
              <p>These Terms shall be governed by and construed in accordance with applicable laws. Any disputes arising from these Terms or your use of the Platform shall first be attempted to be resolved through direct communication with our support team. If unresolved, disputes shall be submitted to binding arbitration in accordance with applicable arbitration rules. You waive any right to a jury trial or class action proceeding.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">18. Changes to Terms</h2>
              <p>We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting on the Platform. Your continued use of the Platform after changes constitutes acceptance of the modified Terms. We encourage you to review these Terms periodically.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">19. Contact Information</h2>
              <p>If you have any questions about these Terms, please contact us through our Support page or email us at <strong className="text-foreground">support@flexipro.com</strong>. We are committed to resolving disputes amicably before any legal action is considered by either party.</p>
            </section>

          </div>
        </div>
      </div>
    </>
  );
}
