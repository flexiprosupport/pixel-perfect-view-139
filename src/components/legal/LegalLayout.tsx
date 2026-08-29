import type { ReactNode } from "react";
import { Link } from "@/lib/router-compat";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageMeta, type BreadcrumbItem } from "@/components/seo/PageMeta";

interface LegalLayoutProps {
  title: string;
  metaTitle: string;
  description: string;
  canonicalPath: string;
  breadcrumbLabel: string;
  subtitle?: string;
  effectiveDate?: string;
  summary?: ReactNode;
  children: ReactNode;
}

export function LegalLayout({
  title,
  metaTitle,
  description,
  canonicalPath,
  breadcrumbLabel,
  subtitle,
  effectiveDate,
  summary,
  children,
}: LegalLayoutProps) {
  const breadcrumbs: BreadcrumbItem[] = [
    { name: "Home", path: "/" },
    { name: breadcrumbLabel, path: canonicalPath },
  ];

  return (
    <>
      <PageMeta
        title={metaTitle}
        description={description}
        canonicalPath={canonicalPath}
        breadcrumbs={breadcrumbs}
      />
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Link to="/">
            <Button variant="ghost" size="sm" className="mb-8 gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Button>
          </Link>

          <h1 className="text-3xl font-bold mb-2">{title}</h1>
          {subtitle ? <p className="text-muted-foreground">{subtitle}</p> : null}
          {effectiveDate ? (
            <p className="text-sm text-muted-foreground mb-8">Effective date: {effectiveDate}</p>
          ) : (
            <div className="mb-8" />
          )}

          {summary ? (
            <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-4 mb-8 text-sm leading-relaxed text-foreground/90">
              {summary}
            </div>
          ) : null}

          <div className="max-w-none space-y-8 text-muted-foreground leading-relaxed">{children}</div>

          <div className="mt-12 pt-6 border-t border-border text-sm text-muted-foreground">
            <p className="mb-2 font-medium text-foreground">Related policies</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <Link className="hover:text-orange-500" to="/terms">Terms</Link>
              <Link className="hover:text-orange-500" to="/privacy">Privacy</Link>
              <Link className="hover:text-orange-500" to="/refund">Refunds</Link>
              <Link className="hover:text-orange-500" to="/delivery">Delivery</Link>
              <Link className="hover:text-orange-500" to="/cookies">Cookies</Link>
              <Link className="hover:text-orange-500" to="/ethical-use">Ethical Use</Link>
              <Link className="hover:text-orange-500" to="/about">About</Link>
              <Link className="hover:text-orange-500" to="/contact">Contact</Link>
              <Link className="hover:text-orange-500" to="/support">Help Center</Link>
              <Link className="hover:text-orange-500" to="/api-access">API Docs</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

export function SubSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-lg font-medium text-foreground">{title}</h3>
      {children}
    </div>
  );
}

export function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc pl-6 space-y-1">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export function DataTable({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-card">
          <tr>
            {head.map((h) => (
              <th key={h} className="text-left font-semibold text-foreground px-4 py-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-border align-top">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
