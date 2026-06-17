# Discord Bot Builder

AIと会話してDiscordボットのコードを自動生成するWebアプリです。

## 機能

- 複数プロジェクト管理
- 複数ファイル・タブ管理
- 任意のOpenAI互換API対応（Groq / OpenAI / OpenRouter など）
- APIキーの複数登録・切り替え
- APIキーエラー時の通知バナー
- コードのシンタックスハイライト＆コピー
- AIによる3段階コードレビュー（生成→バグチェック→最終確認）
- データはブラウザのlocalStorageに保存

## 対応AIプロバイダー例

| プロバイダー | API URL | モデル例 |
|---|---|---|
| Groq | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o` |
| OpenRouter | `https://openrouter.ai/api/v1` | `meta-llama/llama-3.3-70b-instruct` |
| Anthropic (proxy) | プロキシURLを入力 | モデル名を入力 |

## Cloudflare Pages へのデプロイ方法

### 方法1: Gitリポジトリ連携（推奨）

1. このフォルダをGitHubにpushする
2. [Cloudflare Dashboard](https://dash.cloudflare.com/) を開く
3. **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
4. リポジトリを選択
5. ビルド設定:
   - Framework preset: `None`
   - Build command: （空欄）
   - Build output directory: `/`（または空欄）
6. **Save and Deploy** をクリック

### 方法2: ダイレクトアップロード

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) を開く
2. **Workers & Pages** → **Create** → **Pages** → **Upload assets**
3. プロジェクト名を入力
4. このフォルダ内のファイルを全部ドラッグ&ドロップ
5. **Deploy site** をクリック

## ローカルで試す

```bash
# Python
python -m http.server 8080

# Node.js
npx serve .
```

ブラウザで `http://localhost:8080` を開く。

## ファイル構成

```
discord-bot-builder/
├── index.html     # メインHTML
├── style.css      # スタイル
├── app.js         # アプリロジック
├── _redirects     # Cloudflare SPAルーティング
├── _headers       # Cloudflare セキュリティヘッダー
└── README.md      # このファイル
```

## 使い方

1. 右上の設定アイコンからAPIキーを登録
2. 使用するプロバイダーとモデルを選択して保存
3. ホーム画面で「新規作成」からプロジェクトを作成
4. 右のチャットにやりたいことを入力するとコードが生成される
5. タブでファイルを切り替え、コピーボタンでコードをコピー
