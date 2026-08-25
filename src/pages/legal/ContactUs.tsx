import { Link } from "@/lib/router-compat";
import { ArrowLeft, Mail, Phone, MapPin, Clock, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageMeta } from "@/components/seo/PageMeta";

export default function ContactUs() {
  return (
    <>
      <PageMeta
        title="Contact Us | Extips Panel"
        description="Get in touch with Extips Panel support team. Email, WhatsApp and business address for customer support."
        canonicalPath="/contact"
        breadcrumbs={[{ name: "Home", path: "/" }, { name: "Contact Us", path: "/contact" }]}
      />
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Link to="/">
            <Button variant="ghost" size="sm" className="mb-8 gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Button>
          </Link>

          <h1 className="text-3xl font-bold mb-2">Contact Us</h1>
          <p className="text-muted-foreground mb-8">
            We are here to help. Reach out to us through any of the channels below — we usually respond within a few hours.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 mb-10">
            <div className="rounded-xl border border-border p-5 bg-card">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-orange-500" />
                </div>
                <h2 className="font-semibold text-base">Email Support</h2>
              </div>
              <a href="mailto:support@extipspanel.com" className="text-sm text-orange-500 hover:underline break-all">
                support@extipspanel.com
              </a>
              <p className="text-xs text-muted-foreground mt-2">For all general queries, billing & technical support.</p>
            </div>

            <div className="rounded-xl border border-border p-5 bg-card">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-green-500" />
                </div>
                <h2 className="font-semibold text-base">WhatsApp</h2>
              </div>
              <a href="https://wa.me/13678288027" target="_blank" rel="noreferrer" className="text-sm text-green-500 hover:underline">
                +1 (367) 828-8027
              </a>
              <p className="text-xs text-muted-foreground mt-2">Fastest way to reach us. Available 7 days a week.</p>
            </div>

            <div className="rounded-xl border border-border p-5 bg-card">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-blue-500" />
                </div>
                <h2 className="font-semibold text-base">Phone</h2>
              </div>
              <a href="tel:+13678288027" className="text-sm text-blue-500 hover:underline">
                +1 (367) 828-8027
              </a>
              <p className="text-xs text-muted-foreground mt-2">Call between business hours for urgent issues.</p>
            </div>

            <div className="rounded-xl border border-border p-5 bg-card">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-purple-500" />
                </div>
                <h2 className="font-semibold text-base">Working Hours</h2>
              </div>
              <p className="text-sm">Monday – Saturday</p>
              <p className="text-sm">9:00 AM – 6:00 PM EST</p>
              <p className="text-xs text-muted-foreground mt-2">Live chat and email monitored 24/7.</p>
            </div>
          </div>

          <div className="rounded-xl border border-border p-6 bg-card">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                <MapPin className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <h2 className="font-semibold mb-2 text-base">Registered Business Address</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Extips Panel LLC<br />
                  8 The Green, Suite #14490,<br />
                  Dover, DE 19901,<br />
                  United States of America
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10 text-sm text-muted-foreground">
            <p>
              For grievances, please email <a className="text-orange-500 hover:underline" href="mailto:support@extipspanel.com">support@extipspanel.com</a> with subject line "Grievance" — our grievance officer will respond within 48 hours.
            </p>
          </div>
        </div>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            name: "Extips Panel LLC",
            url: "https://extipspanel.com/",
            email: "support@extipspanel.com",
            telephone: "+1-367-828-8027",
            address: {
              "@type": "PostalAddress",
              streetAddress: "8 The Green, Suite #14490",
              addressLocality: "Dover",
              addressRegion: "DE",
              postalCode: "19901",
              addressCountry: "US",
            },
            openingHoursSpecification: [
              {
                "@type": "OpeningHoursSpecification",
                dayOfWeek: [
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                ],
                opens: "09:00",
                closes: "18:00",
              },
            ],
          }),
        }}
      />
    </>
  );
}