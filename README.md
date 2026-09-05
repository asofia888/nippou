# 一人社長の日報

一人社長のための、ミニマルな日報アプリです。スマホから数十秒で書けて、
月次の記録は CSV でそのまま税理士に渡せます。

- **書く** — 日付・稼働時間・業務内容・成果・気づき・明日の予定。クイックタグで入力を短縮
- **残す** — 1日1件。同じ日付に二重登録しようとすると確認が入ります
- **渡す** — Excel でも文字化けしない UTF-8 (BOM付き) CSV。月単位での書き出しに対応
- **送る** — LINE やメールへの共有、日報全文のクリップボードコピー
- **守る** — JSON でのバックアップと復元。ホーム画面に追加すればオフラインでも動作

データは**この端末のブラウザ内 (localStorage) にのみ**保存されます。サーバーには一切送信しません。
その代わり、ブラウザのデータを消したり機種変更したりすると失われます。
設定画面から**バックアップ (JSON) を保存**しておいてください。CSV は提出・閲覧用で、復元には使えません。

## 開発

Node.js が必要です。

```bash
npm install
npm run dev        # http://localhost:3000
```

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバーを起動 |
| `npm run build` | `dist/` に本番ビルド |
| `npm run preview` | 本番ビルドをローカルで確認 |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript の型チェック (strict) |
| `npm test` | Vitest によるユニットテスト |
| `npm run check` | lint → typecheck → test をまとめて実行 |

環境変数は不要です (`.env.example` を参照)。

## 構成

React 19 + TypeScript (strict) + Vite + Tailwind CSS v4。ルーターや状態管理ライブラリは使っていません。

```
src/
  App.tsx              画面全体の状態と永続化の入り口
  components/
    Header.tsx         タブ・CSV出力・設定・バックアップ
    ReportForm.tsx     日報の作成と編集
    ReportList.tsx     一覧・検索・月フィルタ・CSV出力
    Modal.tsx          ダイアログ共通処理 (Escape・フォーカストラップ・背景スクロール抑止)
  utils/
    storage.ts         localStorage の読み書きと読み込み時のスキーマ検証
    backup.ts          JSON バックアップの生成と読み取り
    csv.ts             CSV 生成 (数式インジェクション対策つき) と共有用テキスト
    date.ts            日付の整形 (すべてローカル時刻)
    search.ts          日本語検索の正規化 (全角半角・カタカナひらがな)
public/
  manifest.webmanifest / sw.js / アイコン一式   PWA
```

### PWA について

`manifest.webmanifest` と Service Worker を同梱しています。ホーム画面に追加すると、
オフラインで起動できるほか、**iOS Safari が 7 日間未訪問のサイトの localStorage を削除する対象から外れます**。
日々の記録を預ける以上、ホーム画面への追加を推奨します。

Service Worker は本番ビルドでのみ登録されます (`src/main.tsx`)。
配信内容を更新したのに反映されない場合は、`public/sw.js` の `VERSION` を上げてください。
