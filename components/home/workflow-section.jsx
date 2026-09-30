import { Camera, Check, Copy, MessageSquareText } from 'lucide-react';
import { MAX_JOB_PHOTOS } from '@/lib/constants';
import { SectionHeading } from './cta-link';

function StepCard({ number, title, body, children }) {
  return (
    <li className="flex flex-col gap-4 rounded-card border border-border bg-card p-6 shadow-card">
      <span
        className="inline-flex size-9 items-center justify-center rounded-full bg-brand text-sm font-bold text-white"
        aria-hidden="true"
      >
        {number}
      </span>
      <div className="flex flex-col gap-1.5">
        <h3 className="m-0 text-lg font-semibold">
          <span className="sr-only">Step {number}: </span>
          {title}
        </h3>
        <p className="m-0 text-[15px] leading-relaxed text-muted-foreground">{body}</p>
      </div>
      {/* A small drawn preview of the step; decoration only. */}
      <div aria-hidden="true" className="mt-auto rounded-xl bg-surface-muted p-3.5 text-sm">
        {children}
      </div>
    </li>
  );
}

export default function WorkflowSection() {
  return (
    <section id="how" aria-labelledby="workflow-heading" className="px-4 py-14 md:px-6 md:py-20">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-10">
        <SectionHeading
          id="workflow-heading"
          eyebrow="How it works"
          title="From message to quote in three steps."
          lead="No spreadsheets, no templates to set up. Straight from your phone or laptop."
        />
        <ol className="m-0 grid list-none gap-4 p-0 md:grid-cols-3 md:gap-5">
          <StepCard
            number={1}
            title="Describe the job"
            body={`Type it or paste the customer's message, and add up to ${MAX_JOB_PHOTOS} photos of the site. It reads the photos too, so there's less to explain.`}
          >
            <p className="m-0 flex items-start gap-2 text-foreground">
              <MessageSquareText className="mt-0.5 size-4 shrink-0 text-brand" />
              Swap the old fuse box for a modern consumer unit, about 8 circuits.
            </p>
            <p className="m-0 mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Camera className="size-3.5" />2 photos added
            </p>
          </StepCard>
          <StepCard
            number={2}
            title="Answer a few quick questions"
            body="The ones a good tradesperson would ask for that trade, like the age of the install or the access, then tick, untick or add to the materials list."
          >
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {['Consumer unit 10-way RCBO', 'RCBO 32A Type A', 'Surge protection device'].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="inline-flex size-4 items-center justify-center rounded bg-brand text-white">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </StepCard>
          <StepCard
            number={3}
            title="Send a professional quote"
            body="Get scope, assumptions and exclusions in plain English. Look up real supplier prices, then copy it into an email or WhatsApp."
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">Consumer unit replacement</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-success">
                Ready
              </span>
            </div>
            <p className="m-0 mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Copy className="size-3.5" />
              Copied to clipboard
            </p>
          </StepCard>
        </ol>
      </div>
    </section>
  );
}
