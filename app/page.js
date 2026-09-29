import HeroSection from '@/components/home/hero-section';
import ProblemSection from '@/components/home/problem-section';
import WorkflowSection from '@/components/home/workflow-section';
import QuoteDocumentProof from '@/components/home/quote-document-proof';
import FeaturesGrid from '@/components/home/features-grid';
import TradeCoverage from '@/components/home/trade-coverage';
import FaqSection from '@/components/home/faq-section';
import ClosingCtaBand from '@/components/home/closing-cta-band';
import HomeFooter from '@/components/home/home-footer';

export const metadata = {
  title: 'QuoteFetch · Quotes for UK tradespeople',
  description:
    "Paste the customer's message, add a photo, and QuoteFetch drafts a clear quote with materials, scope, assumptions and exclusions.",
};

// The marketing homepage: static content only, so it's prerendered. The app itself starts at /quote/new.
export default function Home() {
  return (
    <div data-page-shell data-smooth-scroll>
      <HeroSection />
      {/* Alternating white bands separate the sections on the stone background. */}
      <div className="bg-card">
        <ProblemSection />
      </div>
      <WorkflowSection />
      <div className="bg-card">
        <QuoteDocumentProof />
      </div>
      <FeaturesGrid />
      <div className="bg-card">
        <TradeCoverage />
      </div>
      <FaqSection />
      <ClosingCtaBand />
      <HomeFooter />
    </div>
  );
}
