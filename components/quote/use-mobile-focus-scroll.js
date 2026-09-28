'use client';

import { useEffect } from 'react';
import { focusScrollTarget } from '@/lib/new-quote';

const MOBILE = '(max-width: 767px)';
// Long enough for the on-screen keyboard to finish opening, and for the browser's own scroll to settle.
const KEYBOARD_DELAY_MS = 300;
const TEXT_FIELDS = 'textarea, input:not([type=checkbox], [type=radio], [type=file], [type=button], [type=submit], [type=hidden])';

// On phones, scroll a focused text field (and its label) to just under the sticky header, giving it the
// most room above the keyboard. A native listener, so portalled popovers (the trade search) are left alone.
export function useMobileFocusScroll(ref) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let timer = null;

    function onFocusIn(e) {
      const field = e.target;
      if (!window.matchMedia(MOBILE).matches || !field.matches?.(TEXT_FIELDS)) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (document.activeElement !== field) return;
        const header = document.querySelector('header');
        const label = field.labels?.[0];
        const target = focusScrollTarget({
          scrollY: window.scrollY,
          fieldTop: field.getBoundingClientRect().top,
          labelTop: label ? label.getBoundingClientRect().top : null,
          headerBottom: header ? header.getBoundingClientRect().bottom : 0,
        });
        if (target === null) return;
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: target, behavior: reduce ? 'auto' : 'smooth' });
      }, KEYBOARD_DELAY_MS);
    }

    root.addEventListener('focusin', onFocusIn);
    return () => {
      clearTimeout(timer);
      root.removeEventListener('focusin', onFocusIn);
    };
  }, [ref]);
}
