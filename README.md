# AI Code Builder

AIと会話してコードを自動生成・改善するWebアプリです。Discord Botに限らず、あらゆるコードに対応します。

## 主な機能

- **汎用コード生成** — Python / JavaScript / TypeScript / HTML / Go / Rust など何でも
- **複数プロジェクト管理**
- **ファイルタブ管理** — 不要ファイルの一括整理、空ファイルの視覚的区別
- **自動反復モード** — AIが2〜10回繰り返し思考してコードを磨き上げる
- **危険操作の承認** — 危険なコード/ファイル削除は必ず確認ダイアログを表示
- **OpenAI互換API対応** — Groq / OpenAI / OpenRouter など
- **差分表示** — 前回AI生成との比較
- **コードのコピー・ダウンロード**
- **プロジェクトのエクスポート・インポート**
- **データはlocalStorageに保存**（旧データも自動移行）

## 対応AIプロバイダー

| プロバイダー | API URL | モデル例 |
|---|---|---|
| Groq | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o` |
| OpenRouter | `https://openrouter.ai/api/v1` | `meta-llama/llama-3.3-70b-instruct` |

## 自動反復モードの使い方

1. チャット右上の時計アイコンをクリック
2. 思考回数（2〜10）と目標を設定
3. 「自動反復を開始」でAIが繰り返し改善を実施
4. 各イテレーションの進捗がチャットに表示される
5. 途中で「停止」ボタンで中断可能

## ファイル整理の使い方

- タブ右端のゴミ箱アイコン（整理ボタン）をクリック
- 内容が空のファイルは自動でチェック済みになる
- 削除したいファイルにチェックを入れて「選択したファイルを削除」

## 危険操作の承認

以下の操作は必ず確認ダイアログが表示されます：

- ファイル・プロジェクトの削除
- AIが生成したコードに危険なパターンが含まれる場合
  - `eval()` / `exec()` の使用
  - `shell=True` のシェル実行
  - `rm -rf` などの強制削除コマンド
  - データベースの破壊的操作（`DROP TABLE` など）
  - ストレージの全削除

## Cloudflare Pages へのデプロイ

### 方法1: Gitリポジトリ連携（推奨）

1. このフォルダをGitHubにpush
2. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git
3. ビルド設定: Framework preset: `None` / Build command: 空欄 / Output directory: `/`
4. Save and Deploy

### 方法2: ダイレクトアップロード

1. Cloudflare Dashboard → Workers & Pages → Create → Pages → Upload assets
2. このフォルダのファイルを全部ドラッグ&ドロップ
3. Deploy site

## ローカルで試す

```bash
python -m http.server 8080
# または
npx serve .
```

ブラウザで `http://localhost:8080` を開く。

## ファイル構成

```
ai-code-builder/
├── index.html     # メインHTML
├── style.css      # スタイル
├── app.js         # アプリロジック
├── _redirects     # Cloudflare SPAルーティング
├── _headers       # Cloudflare セキュリティヘッダー
└── README.md      # このファイル
```
