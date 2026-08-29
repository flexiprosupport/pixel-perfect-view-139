import { useEffect } from 'react';

export interface BreadcrumbItem {
  name: string;
  path: string; // path relative to BASE_URL, e.g. "/services"
}

export interface FaqItem {
  question: string;
  answer: string;
}

interface PageMetaProps {
  title: string;
  description?: string;
  canonicalPath?: string;
  noIndex?: boolean;
  breadcrumbs?: BreadcrumbItem[];
  faqItems?: FaqItem[];
}

const DEFAULT_DESCRIPTION = "FlexiPro — World's first AI-flexipro panel panel. Real Instagram, YouTube & TikTok engagement with natural delivery. 50,000+ orders, zero bans, 100% safe.";
const SITE_NAME = 'FlexiPro';
const BASE_URL = 'https://flexipro.in';
const BREADCRUMB_SCRIPT_ID = 'breadcrumb-jsonld';
const FAQ_SCRIPT_ID = 'faq-page-jsonld';

export function PageMeta({
  title,
  description = DEFAULT_DESCRIPTION,
  canonicalPath,
  noIndex = false,
  breadcrumbs,
  faqItems,
}: PageMetaProps) {
  useEffect(() => {
    // Set title
    const hasBrand = title.toLowerCase().includes(SITE_NAME.toLowerCase());
    const fullTitle = title === 'Home'
      ? `${SITE_NAME} — Organic Social Media Growth Panel`
      : hasBrand
        ? title
        : `${title} | ${SITE_NAME}`;
    document.title = fullTitle;

    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', description);
    }

    // Update OG title
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', fullTitle);
    }

    // Update OG description
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) {
      ogDescription.setAttribute('content', description);
    }

    // Update OG URL to self-reference current page
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) {
      const path = canonicalPath ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
      ogUrl.setAttribute('content', `${BASE_URL}${path}`);
    }

    // Handle canonical URL
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (canonicalPath) {
      if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.setAttribute('href', `${BASE_URL}${canonicalPath}`);
    } else if (canonicalLink) {
      canonicalLink.remove();
    }

    // Handle robots meta for noindex
    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (noIndex) {
      if (!robotsMeta) {
        robotsMeta = document.createElement('meta');
        robotsMeta.setAttribute('name', 'robots');
        document.head.appendChild(robotsMeta);
      }
      robotsMeta.setAttribute('content', 'noindex, nofollow');
    } else if (robotsMeta) {
      robotsMeta.remove();
    }

    // Handle BreadcrumbList JSON-LD
    document.getElementById(BREADCRUMB_SCRIPT_ID)?.remove();
    if (breadcrumbs && breadcrumbs.length > 0) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = BREADCRUMB_SCRIPT_ID;
      script.text = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((b, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: b.name,
          item: `${BASE_URL}${b.path}`,
        })),
      });
      document.head.appendChild(script);
    }

    // Handle FAQPage JSON-LD
    document.getElementById(FAQ_SCRIPT_ID)?.remove();
    if (faqItems && faqItems.length > 0) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = FAQ_SCRIPT_ID;
      script.text = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqItems.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer },
        })),
      });
      document.head.appendChild(script);
    }

    // Cleanup on unmount
    return () => {
      if (robotsMeta && noIndex) {
        robotsMeta.remove();
      }
      document.getElementById(BREADCRUMB_SCRIPT_ID)?.remove();
      document.getElementById(FAQ_SCRIPT_ID)?.remove();
    };
  }, [title, description, canonicalPath, noIndex, breadcrumbs, faqItems]);

  return null;
}
