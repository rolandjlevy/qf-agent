'use client';

import { useEffect, useRef, useState } from 'react';
import {
  examplePhoto,
  unsplashImageUrl,
  unsplashCredit,
} from '../lib/example-photos.js';

const THUMB = { width: 72, height: 48 };
// Small enough to keep the dialog compact; the dropdown row shows the thumbnail as well.
const PREVIEW = { width: 240, height: 160 };

function Thumb({ trade }) {
  const photo = examplePhoto(trade);
  if (!photo) return <span style={{ width: THUMB.width, height: THUMB.height, flexShrink: 0 }} />;
  return (
    <img
      src={unsplashImageUrl(photo, THUMB)}
      srcSet={`${unsplashImageUrl(photo, THUMB)} 1x, ${unsplashImageUrl(photo, { width: THUMB.width * 2, height: THUMB.height * 2 })} 2x`}
      alt=""
      width={THUMB.width}
      height={THUMB.height}
      loading="lazy"
      style={{ display: 'block', flexShrink: 0, objectFit: 'cover', borderRadius: 3 }}
    />
  );
}

function Row({ example }) {
  const photo = examplePhoto(example.trade);
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
      <Thumb trade={example.trade} />
      <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, textAlign: 'left' }}>
        <span>{example.label}</span>
        {/* Plain-text credit: links inside an option would break keyboard and screen-reader use. */}
        {photo && <span style={{ fontSize: '0.65rem', color: '#888' }}>Photo: {photo.photographer} / Unsplash</span>}
      </span>
    </span>
  );
}

// A dropdown whose options show each example's photo, which a native <select> can't do.
export function ExamplePicker({ examples, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const selected = value === '' ? null : examples[Number(value)];

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    listRef.current?.focus();
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  useEffect(() => {
    if (open) listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  function openList() {
    setActive(selected ? Number(value) : 0);
    setOpen(true);
  }

  function choose(index) {
    onChange(String(index));
    setOpen(false);
    rootRef.current?.querySelector('button')?.focus();
  }

  function onListKeyDown(e) {
    if (e.key === 'ArrowDown') setActive((i) => Math.min(i + 1, examples.length - 1));
    else if (e.key === 'ArrowUp') setActive((i) => Math.max(i - 1, 0));
    else if (e.key === 'Home') setActive(0);
    else if (e.key === 'End') setActive(examples.length - 1);
    else if (e.key === 'Enter' || e.key === ' ') choose(active);
    else if (e.key === 'Escape' || e.key === 'Tab') {
      // Escape closes the list only, not the surrounding <dialog>.
      if (e.key === 'Escape') e.preventDefault();
      setOpen(false);
      if (e.key === 'Escape') rootRef.current?.querySelector('button')?.focus();
      return;
    } else return;
    e.preventDefault();
  }

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            openList();
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          width: '100%',
          padding: '0.35rem 0.5rem',
          border: '1px solid #ccc',
          borderRadius: 4,
          background: '#fff',
          cursor: 'pointer',
          font: 'inherit',
        }}
      >
        {selected ? <Row example={selected} /> : <span style={{ color: '#666' }}>Choose an example…</span>}
        <span aria-hidden="true">▾</span>
      </button>

      {/* In the dialog's flow rather than floating, so the dialog grows to fit it. */}
      {open && (
        <ul
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          aria-activedescendant={`example-option-${active}`}
          onKeyDown={onListKeyDown}
          style={{
            margin: '2px 0 0',
            // About 5½ rows, so opening the list grows the dialog modestly and the rest scrolls.
            maxHeight: 320,
            overflowY: 'auto',
            padding: '0.25rem 0',
            listStyle: 'none',
            background: '#fff',
            border: '1px solid #ccc',
            borderRadius: 4,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            outline: 'none',
          }}
        >
          {examples.map((example, index) => (
            <li
              key={example.label}
              id={`example-option-${index}`}
              data-index={index}
              role="option"
              aria-selected={String(index) === value}
              onPointerEnter={() => setActive(index)}
              onClick={() => choose(index)}
              style={{
                padding: '0.3rem 0.5rem',
                cursor: 'pointer',
                background: index === active ? '#eef3ff' : 'transparent',
              }}
            >
              <Row example={example} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// The chosen example's photo, hotlinked from Unsplash with the credit it requires.
export function ExamplePhoto({ trade }) {
  const photo = examplePhoto(trade);
  if (!photo) return null;
  const credit = unsplashCredit(photo);
  return (
    <figure style={{ margin: 0, position: 'relative', width: 'fit-content', maxWidth: '100%' }}>
      <img
        src={unsplashImageUrl(photo, PREVIEW)}
        srcSet={`${unsplashImageUrl(photo, PREVIEW)} 1x, ${unsplashImageUrl(photo, { width: PREVIEW.width * 2, height: PREVIEW.height * 2 })} 2x`}
        alt={photo.alt}
        width={PREVIEW.width}
        height={PREVIEW.height}
        style={{ display: 'block', maxWidth: '100%', height: 'auto', borderRadius: 4 }}
      />
      {/* Unsplash's API guidelines require this credit; kept small, over the photo's corner. */}
      <figcaption
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          padding: '0.1rem 0.4rem',
          fontSize: '0.65rem',
          lineHeight: 1.4,
          color: '#fff',
          background: 'rgba(0, 0, 0, 0.45)',
          borderRadius: '4px 0 4px 0',
        }}
      >
        Photo by{' '}
        <a href={credit.photographerHref} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
          {credit.photographer}
        </a>{' '}
        on{' '}
        <a href={credit.unsplashHref} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
          Unsplash
        </a>
      </figcaption>
    </figure>
  );
}
