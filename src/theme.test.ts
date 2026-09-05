import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The palette used to be 38 ad-hoc hex values scattered across the components,
 * which is how several of them ended up below 3:1. Now every colour is a token
 * in index.css, and this test holds the whole palette to WCAG AA.
 *
 * The ground and the cards are the same white, so separation comes from
 * elevation. Contrast maths cannot see a shadow — the structure block below
 * instead checks that the shadow tokens exist and that every card actually
 * applies one, since nothing else marks a card's edge any more.
 */
const css = fs.readFileSync(new URL('./index.css', import.meta.url), 'utf8');

const tokens: Record<string, string> = {};
for (const [, name, value] of css.matchAll(/--color-([\w-]+):\s*(#[0-9A-Fa-f]{6});/g)) {
  tokens[name] = value;
}

const shadows = [...css.matchAll(/--shadow-([\w-]+):/g)].map(([, name]) => name);

const COMPONENTS = ['App.tsx', 'components/Header.tsx', 'components/ReportForm.tsx',
  'components/ReportList.tsx', 'components/Modal.tsx'];
const componentSource = COMPONENTS
  .map((f) => fs.readFileSync(new URL(`./${f}`, import.meta.url), 'utf8'))
  .join('\n');

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [x, y] = [relativeLuminance(a), relativeLuminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const ratio = (fg: string, bg: string) => {
  expect(tokens[fg], `token --color-${fg} が未定義`).toBeTruthy();
  expect(tokens[bg], `token --color-${bg} が未定義`).toBeTruthy();
  return contrast(tokens[fg], tokens[bg]);
};

const SURFACES = ['page', 'surface', 'sunken', 'sunken-2'];

describe('theme tokens', () => {
  it('defines every token the components rely on', () => {
    const required = [
      'page', 'surface', 'surface-hover', 'sunken', 'sunken-2',
      'line', 'line-strong',
      'ink', 'ink-2', 'ink-3', 'ink-soft', 'on-dark',
      'accent', 'accent-hover', 'accent-active', 'accent-soft', 'accent-soft-hover',
      'accent-line', 'accent-ink', 'accent-2', 'on-accent', 'on-accent-2',
      'amber-soft', 'amber-line', 'amber-ink', 'mark',
      'danger', 'danger-hover', 'danger-active', 'danger-soft', 'danger-soft-hover',
      'danger-line', 'danger-ink',
      'ring',
    ];
    expect(Object.keys(tokens).sort()).toEqual(expect.arrayContaining(required));
  });
});

describe('text contrast (WCAG AA, 4.5:1)', () => {
  it.each(['ink', 'ink-2', 'ink-3'])('%s is readable on every surface', (fg) => {
    for (const bg of SURFACES) expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ['ink', 'accent-soft'], ['ink', 'amber-soft'], ['ink', 'danger-soft'], ['ink', 'mark'],
    ['accent-ink', 'surface'], ['accent-ink', 'page'], ['accent-ink', 'accent-soft'],
    ['amber-ink', 'surface'], ['amber-ink', 'amber-soft'],
    ['danger-ink', 'surface'], ['danger-ink', 'danger-soft'],
    ['accent-2', 'surface'], ['accent-2', 'page'],
  ])('%s on %s', (fg, bg) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ['on-dark', 'ink'], ['on-dark', 'danger'], ['on-dark', 'danger-hover'],
    ['on-accent', 'accent-hover'], ['on-accent', 'accent-active'],
  ])('%s on the filled surface %s', (fg, bg) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('the accent exception', () => {
  // The owner picked a brighter orange than AA allows for body text. Rather
  // than drop the check, it is pinned at the level the colour actually holds,
  // so the band cannot drift brighter without someone deciding to.
  it('keeps white on the accent above the 3.0 floor for large text and UI edges', () => {
    expect(ratio('on-accent', 'accent')).toBeGreaterThanOrEqual(3.0);
  });

  it('still clears AA on the hover and pressed states', () => {
    expect(ratio('on-accent', 'accent-hover')).toBeGreaterThanOrEqual(4.5);
    expect(ratio('on-accent', 'accent-active')).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps orange text on light surfaces at full AA', () => {
    for (const bg of ['surface', 'page', 'accent-soft']) {
      expect(ratio('accent-ink', bg)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('structure', () => {
  // A shadow is not a control boundary: inputs, chips and tinted blocks still
  // need a real outline someone can see.
  it.each([
    ['line', 'surface'], ['line', 'sunken'], ['line-strong', 'surface'],
    ['accent-line', 'accent-soft'], ['amber-line', 'amber-soft'], ['danger-line', 'danger-soft'],
  ])('%s stays visible against %s', (fg, bg) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(1.8);
  });

  it('lifts white cards off the grey ground', () => {
    expect(ratio('surface', 'page')).toBeGreaterThan(1.05);
  });

  it('keeps sunken fills distinct from the cards they sit in', () => {
    expect(ratio('sunken', 'surface')).toBeGreaterThan(1.08);
    expect(ratio('sunken-2', 'surface')).toBeGreaterThan(1.08);
  });

  // The accent is only just above 4.5:1 with white, so there is no room for a
  // dimmed white on the header band: every label there has to be pure white.
  // on-accent-2 is therefore for disabled controls only, which WCAG exempts.
  it('never uses the dimmed on-accent tint for live text', () => {
    const misuse = (componentSource.match(/[^\s'"`]*on-accent-2[^\s'"`]*/g) ?? [])
      .filter((cls) => cls.startsWith('text-'));
    const liveText = misuse.filter((cls) => {
      const line = componentSource.split('\n').find((l) => l.includes(cls)) ?? '';
      return !line.includes('cursor-not-allowed');
    });
    expect(liveText, `無効状態以外で使用: ${liveText.join(' | ')}`).toEqual([]);
  });

  it('defines the elevation tokens cards depend on', () => {
    expect(shadows).toEqual(expect.arrayContaining(['card', 'card-hover', 'modal']));
  });

  it('gives every card an elevation, now that none of them has an outline', () => {
    const cards = componentSource.match(/className=[^\n]*bg-surface[^"`\n]*rounded-2xl[^"`\n]*/g) ?? [];
    expect(cards.length).toBeGreaterThan(0);
    const flat = cards.filter((c) => !/\bshadow-(card|modal)\b/.test(c));
    expect(flat, `影のないカード: ${flat.join(' | ')}`).toEqual([]);
  });

  it('no longer outlines cards, so the shadow is the only edge', () => {
    const outlined = componentSource
      .match(/className=[^\n]*bg-surface[^"`\n]*rounded-2xl[^"`\n]*/g) ?? [];
    expect(outlined.filter((c) => /\bborder border-line\b/.test(c))).toEqual([]);
  });
});
