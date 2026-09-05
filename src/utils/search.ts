/**
 * Fold a string so Japanese search behaves the way people expect.
 *
 * NFKC unifies full-width/half-width forms (ＡＢＣ→ABC, ﾐﾂﾓﾘ→ミツモリ), and
 * katakana is then folded to hiragana so 「ミツモリ」and「みつもり」match each
 * other. Kanji is left alone — 「見積」still has to be typed as kanji.
 */
export function foldForSearch(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .toLowerCase();
}

/** Split a query into search terms, folded and whitespace-separated. */
export function toSearchTerms(query: string): string[] {
  return foldForSearch(query).trim().split(/\s+/).filter(Boolean);
}
