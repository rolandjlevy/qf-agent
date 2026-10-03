'use client'

import { useActionState, useState } from 'react'
import { ChevronDown, CircleAlert, CircleCheck, Loader2, Save } from 'lucide-react'
import { saveProfile } from '../../lib/actions/profile.js'
import { TRADES_BY_LABEL, VALID_TONES, toneOrDefault, tradeLabel } from '../../lib/constants.js'
import { cn } from '@/lib/utils'
import { CARD_CLASS, ChoiceChip } from '@/components/quote/step-layout'
import { ACTION_BAR_CLASS, primaryButtonClass } from '@/components/quote/primary-action'

// The same field look as step 2's TextField, for inputs, textareas and selects.
const CONTROL_CLASS =
  'w-full rounded-control border border-input bg-card px-3.5 text-base text-foreground shadow-xs outline-none transition-all placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand-subtle-border md:text-[15px]'
const INPUT_CLASS = cn(CONTROL_CLASS, 'h-11')
const TEXTAREA_CLASS = cn(CONTROL_CLASS, 'resize-y py-2.5 leading-relaxed')

// A label, an optional hint under it, then the control.
function Field({ id, label, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-foreground">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="m-0 -mt-0.5 text-[13px] leading-snug text-muted-foreground">
          {hint}
        </p>
      )}
      {children}
    </div>
  )
}

// One white card per group of fields, with its own h2.
function Section({ id, title, description, children }) {
  return (
    <section aria-labelledby={id} className={cn(CARD_CLASS, 'flex flex-col gap-5 p-5 md:p-7')}>
      <div className="flex flex-col gap-1">
        <h2 id={id} className="m-0 text-xl leading-tight font-bold">
          {title}
        </h2>
        {description && <p className="m-0 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  )
}

const capitalise = (word) => word[0].toUpperCase() + word.slice(1)

export default function ProfileForm({ profile }) {
  const [saveState, saveAction, savePending] = useActionState(saveProfile, { success: false, error: null })
  const [tone, setTone] = useState(toneOrDefault(profile?.default_tone))

  return (
    <form action={saveAction} className="flex flex-col gap-5 md:gap-6">
      <Section id="profile-business" title="Business details" description="Shown at the top of every quote.">
        <Field id="business_name" label="Business name">
          <input
            id="business_name"
            data-slot="input"
            className={INPUT_CLASS}
            type="text"
            name="business_name"
            autoComplete="organization"
            defaultValue={profile?.business_name || ''}
          />
        </Field>
        <Field id="contact_details" label="Contact details" hint="Phone, email and address, one per line.">
          <textarea
            id="contact_details"
            data-slot="input"
            className={TEXTAREA_CLASS}
            name="contact_details"
            rows={3}
            aria-describedby="contact_details-hint"
            defaultValue={profile?.contact_details || ''}
          />
        </Field>
        <Field id="service_area" label="Service area" hint="For example, “North London and surrounding areas”.">
          <input
            id="service_area"
            data-slot="input"
            className={INPUT_CLASS}
            type="text"
            name="service_area"
            aria-describedby="service_area-hint"
            defaultValue={profile?.service_area || ''}
          />
        </Field>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 self-start text-[15px] font-semibold">
          <input
            type="checkbox"
            name="vat_registered"
            defaultChecked={profile?.vat_registered || false}
            className="size-5 cursor-pointer accent-brand"
          />
          VAT registered
        </label>
      </Section>

      <Section id="profile-quoting" title="How you quote" description="Used when QuoteFetch drafts your quotes.">
        <Field id="trade" label="Your trade" hint="New quotes start with this. You can change it on any quote.">
          <div className="relative">
            <select
              id="trade"
              data-slot="input"
              className={cn(INPUT_CLASS, 'cursor-pointer appearance-none pr-10')}
              name="trade"
              aria-describedby="trade-hint"
              defaultValue={profile?.trade || ''}
            >
              <option value="">Not set</option>
              {TRADES_BY_LABEL.map((t) => (
                <option key={t} value={t}>
                  {tradeLabel(t)}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
          </div>
        </Field>

        <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
          <legend className="mb-2.5 p-0 text-sm font-semibold text-foreground">Tone for your quotes</legend>
          <div className="flex flex-wrap gap-2">
            {VALID_TONES.map((t) => (
              <ChoiceChip key={t} name="default_tone" value={t} checked={tone === t} onChange={() => setTone(t)}>
                {capitalise(t)}
              </ChoiceChip>
            ))}
          </div>
        </fieldset>

        <Field id="hourly_rate" label="Hourly rate">
          <div className="relative md:max-w-[200px]">
            <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground">£</span>
            <input
              id="hourly_rate"
              data-slot="input"
              className={cn(INPUT_CLASS, 'pl-8 tabular-nums')}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              name="hourly_rate"
              defaultValue={profile?.hourly_rate ?? ''}
            />
          </div>
        </Field>

        <Field
          id="certifications"
          label="Certifications and registrations"
          hint="For example, “Gas Safe Reg 123456”. Quotes only mention what you write here."
        >
          <textarea
            id="certifications"
            data-slot="input"
            className={TEXTAREA_CLASS}
            name="certifications"
            rows={2}
            aria-describedby="certifications-hint"
            defaultValue={profile?.certifications || ''}
          />
        </Field>
      </Section>

      <Section id="profile-wording" title="Your wording">
        <Field id="standard_terms" label="Standard terms and conditions">
          <textarea
            id="standard_terms"
            data-slot="input"
            className={TEXTAREA_CLASS}
            name="standard_terms"
            rows={4}
            defaultValue={profile?.standard_terms || ''}
          />
        </Field>
        <Field
          id="voice_sample"
          label="How you normally write to customers"
          hint="Paste a message you've sent before. Quotes are written to sound like you."
        >
          <textarea
            id="voice_sample"
            data-slot="input"
            className={TEXTAREA_CLASS}
            name="voice_sample"
            rows={3}
            aria-describedby="voice_sample-hint"
            defaultValue={profile?.voice_sample || ''}
          />
        </Field>
      </Section>

      <div className={ACTION_BAR_CLASS}>
        <div className="flex flex-col items-stretch gap-2.5 md:flex-row md:items-center md:gap-4">
          <button
            type="submit"
            data-slot="primary-action"
            disabled={savePending}
            className={primaryButtonClass(!savePending)}
          >
            {savePending ? (
              <>
                <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                Saving…
              </>
            ) : (
              <>
                <Save className="size-5" strokeWidth={1.75} aria-hidden="true" />
                Save details
              </>
            )}
          </button>
          <p
            role="status"
            className={cn(
              'm-0 flex items-center justify-center gap-1.5 text-center text-[13px] leading-snug md:justify-start md:text-left',
              saveState.error ? 'text-destructive' : 'text-success',
            )}
          >
            {!savePending && saveState.success && (
              <>
                <CircleCheck className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
                Details saved
              </>
            )}
            {!savePending && saveState.error && (
              <>
                <CircleAlert className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
                {saveState.error}
              </>
            )}
          </p>
        </div>
      </div>
    </form>
  )
}
