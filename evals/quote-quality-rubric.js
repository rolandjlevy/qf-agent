// The judge's rubric for scripts/eval-quotes.mjs: nine quote sections scored 0–2, plus question coverage.
// Labour and totals are null by design (QuoteFetch never prices); see the product notes below.

export const RUBRIC_SECTIONS = ['header', 'introduction', 'scope', 'materials', 'labour', 'assumptions', 'exclusions', 'totals', 'terms']

export const QUOTE_RUBRIC = `Score each of these 9 sections 0, 1, 2 or null:

1. header: business details, customer details, quote number, date, validity
2. introduction: warm, professional, summarises the job in plain English
3. scope: detailed tasks in plain English, specific enough that both parties know what "done" looks like
4. materials: specific single products with quantities, each marked "[Price TBC]", never vague like "various materials"
5. labour: itemised by task or as a project total
6. assumptions: specific to THIS job, not boilerplate like "we assume normal access"; they should refer to the actual property, installation or conditions described
7. exclusions: what is NOT covered, specific enough to prevent disputes; should name things the customer might reasonably assume ARE included
8. totals: subtotal, VAT if registered, total, or a clear placeholder
9. terms: validity period, payment terms, how to accept (this product's NEXT STEPS and DISCLAIMERS sections)

Scores:
  2 = strong: trade-specific, thorough, a customer would trust it
  1 = present but thin: generic, vague, or missing trade-specific detail
  0 = missing or wrong: section absent, or contains incorrect information
  null = not applicable (excluded from averages)

PRODUCT NOTES (score with these in mind):
- QuoteFetch deliberately never writes prices or labour costs. Materials are always "[Price TBC]"; the trader adds real prices afterwards in a separate screen. So "labour" and "totals" are null unless the quote invents a price, rate or total, which scores 0.
- "[Price TBC]" on materials is correct, not a weakness.
- The quote must never claim regulatory compliance (Part P, Gas Safe, BS 7671, Building Regulations and similar) or that work will be certified. Any such claim is a defect: score the section it appears in 0. Naming the notification or certificate as an assumption, exclusion or next step for the trader to confirm is fine.
- Materials lines must each be one specific product: no "X or Y" alternatives, no two items on one line, no service items (disposal, hire) or generic terms (sundries, consumables).
- Output is plain text meant to paste into an email: capitalised headings and bullets, no tables.

QUESTIONS (score separately):
- The questions are everything the trader was asked before drafting: the trade's fixed key questions, then up to two job-specific clarifying questions.
- Count how many of the expected gaps the questions covered. A gap counts as covered if a question asked about it, even indirectly; a gap the job description already answers also counts as covered.
- List any questions that were irrelevant to this job or generic.`
