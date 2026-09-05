import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The palette used to be 38 ad-hoc hex values scattered across the components,
 * which is how several of them ended up below 3:1. Now every colour is a token
 * in index.css, and this test holds the whole palette to WCAG AA.
 */
const css = fs.readFileSync(new URL('./index.css', import.meta.url), 'utf8');

const tokens: Record<string, string> = {};
for (const [, name, value] of css.matchAll(/--color-([\w-]+):\s*(#[0-9A-Fa-f]{6});/g)) {
  tokens[name] = value;
}

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
      'accent-line', 'accent-ink', 'accent-2',
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
    ['on-dark', 'ink'], ['on-dark', 'accent'], ['on-dark', 'accent-hover'],
    ['on-dark', 'accent-active'], ['on-dark', 'danger'], ['on-dark', 'danger-hover'],
  ])('%s on the filled surface %s', (fg, bg) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('structure', () => {
  // Borders were the actual readability problem: at 1.4:1 the cards dissolved
  // into the background. Not a WCAG rule, but the whole layout depends on it.
  it.each([
    ['line', 'surface'], ['line', 'page'],
    ['line-strong', 'surface'], ['line-strong', 'page'],
    ['accent-line', 'accent-soft'], ['amber-line', 'amber-soft'], ['danger-line', 'danger-soft'],
  ])('%s stays visible against %s', (fg, bg) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(1.8);
  });

  it('lifts cards off the ivory ground', () => {
    expect(ratio('surface', 'page')).toBeGreaterThan(1.10);
  });

  it('keeps sunken fills distinct from the cards they sit in', () => {
    expect(ratio('sunken', 'surface')).toBeGreaterThan(1.10);
  });
});
