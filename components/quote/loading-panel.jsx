'use client';

import { useEffect, useState } from 'react';

// Frame for every wait in the quote flow: an announced title and message, and after
// `slowAfterMs` a reassurance line instead, so a long wait never looks stuck.
export default function LoadingPanel({ title, message, slowMessage, slowAfterMs = 15000, children }) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!slowMessage) return undefined;
    const timer = setTimeout(() => setSlow(true), slowAfterMs);
    return () => clearTimeout(timer);
  }, [slowMessage, slowAfterMs]);

  return (
    <section aria-busy="true" className="flex flex-col gap-5">
      <div role="status" className="flex flex-col gap-1">
        <h2 className="m-0 text-2xl leading-tight font-bold">{title}</h2>
        <p className="m-0 text-[15px] text-muted-foreground">{slow ? slowMessage : message}</p>
      </div>
      {children}
    </section>
  );
}
