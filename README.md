# 工事見積管理システム

React + Vite + Supabaseを使用した工事プロジェクトの見積管理システムです。

## 機能

- ✅ ユーザー認証（ログイン・ログアウト）
- ✅ プロジェクト登録・編集・削除
- ✅ 統計サマリー表示
- ✅ プロジェクト一覧テーブル（ソート機能付き）
- ✅ 客先別集計表示
- ✅ Excelエクスポート・インポート
- ✅ レスポンシブデザイン

## 技術スタック

- **フロントエンド**: React 18 + Vite
- **バックエンド**: Supabase (PostgreSQL + Auth)
- **スタイリング**: Tailwind CSS
- **アイコン**: lucide-react
- **エクスポート**: xlsx ライブラリ

## セットアップ

1. 依存関係のインストール
```bash
npm install
```

2. 環境変数の設定
`.env.local.template`を`.env.local`にコピーし、Supabaseの設定を入力

3. 開発サーバーの起動
```bash
npm run dev
```

## ビルド

```bash
npm run build
```

## デプロイ

Vercel、Netlify等のホスティングサービスにデプロイ可能です。

## ライセンス

MIT License