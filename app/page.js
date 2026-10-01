import HeroSection from '@/components/home/hero-section';
import ProblemSection from '@/components/home/problem-section';
import WorkflowSection from '@/components/home/workflow-section';
import QuoteDocumentProof from '@/components/home/quote-document-proof';
import TrustSection from '@/components/home/trust-section';
import TestimonialsSection from '@/components/home/testimonials-section';
import TradeCoverage from '@/components/home/trade-coverage';
import PricingTeaser from '@/components/home/pricing-teaser';
import FaqSection, { FAQ_JSON_LD } from '@/components/home/faq-section';
import ClosingCtaBand from '@/components/home/closing-cta-band';
import HomeFooter from '@/components/home/home-footer';

export const metadata = {
  title: 'QuoteFetch — AI Quoting Software for UK Tradespeople',
  description:
    "Turn rough notes, a customer's message or a few photos into a professional quote in minutes — materials, scope, assumptions and exclusions. Built for UK sole traders. Never makes up prices.",
  openGraph: {
    title: 'QuoteFetch — AI Quoting for UK Tradespeople',
    description:
      "Turn rough notes into a professional quote, ready to send. QuoteFetch drafts clear, professional quotes from your notes or a customer's message. Never invents a price.",
    images: ['/og-image.png'],
  },
  twitter: { card: 'summary_large_image' },
};

// White and off-white bands, bordered top and bottom, separate sections on the paper background.
const band = 'border-y border-border bg-card';
const surfaceBand = 'border-y border-border bg-surface-muted';

// The marketing homepage: static content only, so it's prerendered. The app itself starts at /quote/new.
export default function Home() {
  return (
    <div data-page-shell data-smooth-scroll>
      <script
        type="application/ld+json"
        // Escaped '<' so no answer text can close the script tag.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(FAQ_JSON_LD).replace(/</g, '\\u003c'),
        }}
      />
      <HeroSection />
      <div className={band}>
        <ProblemSection />
      </div>
      <WorkflowSection />
      <div className={surfaceBand}>
        <QuoteDocumentProof />
      </div>
      <TrustSection />
      <div className={band}>
        <TestimonialsSection />
      </div>
      <TradeCoverage />
      <div className={surfaceBand}>
        <PricingTeaser />
      </div>
      <FaqSection />
      <ClosingCtaBand />
      <HomeFooter />
    </div>
  );
}
