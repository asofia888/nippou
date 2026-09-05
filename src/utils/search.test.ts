import { describe, expect, it } from 'vitest';
import { foldForSearch, toSearchTerms } from './search';

describe('foldForSearch', () => {
  it.each([
    ['全角英数を半角に', 'ＡＢＣ１２３', 'abc123'],
    ['半角カナを全角カナ経由でひらがなに', 'ﾐﾂﾓﾘ', 'みつもり'],
    ['カタカナをひらがなに', 'ミツモリ', 'みつもり'],
    ['大文字を小文字に', 'Invoice', 'invoice'],
    ['濁点つき半角カナ', 'ｶﾞｲﾁｭｳ', 'がいちゅう'],
  ])('%s', (_label, input, expected) => {
    expect(foldForSearch(input)).toBe(expected);
  });

  it('makes different notations of the same word match', () => {
    for (const q of ['ミツモリ', 'みつもり', 'ﾐﾂﾓﾘ']) {
      expect(foldForSearch('あすまでにみつもりを送る')).toContain(foldForSearch(q));
    }
  });

  it('leaves kanji untouched', () => {
    expect(foldForSearch('見積書')).toBe('見積書');
  });
});

describe('toSearchTerms', () => {
  it('splits on any run of whitespace, full-width included', () => {
    expect(toSearchTerms('見積　　A社  請求')).toEqual(['見積', 'a社', '請求']);
  });

  it('returns nothing for a blank query', () => {
    expect(toSearchTerms('   ')).toEqual([]);
  });
});
