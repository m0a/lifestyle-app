# Research: Health Tracker

**Feature**: 001-health-tracker
**Date**: 2025-12-27
**Status**: Complete

## Technology Decisions

### 1. Authentication Strategy

**Decision**: Session-based authentication with Hono + Cloudflare Workers

**Rationale**:
- Cloudflare Workers環境でのシンプルな実装
- D1にセッション情報を保存し、JWTの複雑さを回避
- セキュアなHTTPOnly cookieでトークン管理

**Alternatives Considered**:
- JWT: ステートレスだが、トークン無効化が複雑
- OAuth2: 外部依存が増え、シンプルさの原則に反する

### 2. Offline Sync Strategy

**Decision**: IndexedDB + Background Sync API

**Rationale**:
- ブラウザ標準APIでライブラリ依存を最小化
- Service Worker経由でバックグラウンド同期
- Conflict resolution: Last-Write-Wins (記録時刻ベース)

**Alternatives Considered**:
- PouchDB/CouchDB: 過剰な機能、バンドルサイズ増大
- localStorage: 容量制限、構造化データに不向き

### 3. State Management (Frontend)

**Decision**: Zustand + React Query

**Rationale**:
- Zustand: 軽量、TypeScript親和性が高い
- React Query: サーバー状態管理、キャッシュ、オフライン対応
- Redux等と比較してボイラープレートが少ない

**Alternatives Considered**:
- Redux Toolkit: 学習コスト高、小規模アプリには過剰
- Jotai/Recoil: 原子的状態管理は本アプリの要件に合わない

### 4. Chart Library

**Decision**: Chart.js with react-chartjs-2

**Rationale**:
- 軽量（バンドルサイズ約60KB）
- 折れ線グラフ・棒グラフの基本機能で十分
- React統合が成熟

**Alternatives Considered**:
- Recharts: 宣言的だがバンドルサイズ大きい
- D3.js: 低レベルすぎ、開発工数増大
- Victory: Recharts同様にサイズが大きい

### 5. Form Handling

**Decision**: React Hook Form + Zod resolver

**Rationale**:
- 型安全なフォームバリデーション
- Zodスキーマを共有パッケージで再利用
- パフォーマンス最適化済み（uncontrolled components）

**Alternatives Considered**:
- Formik: 重量、再レンダリング問題
- Native forms: バリデーション実装工数

### 6. PWA Implementation

**Decision**: Vite PWA Plugin + Workbox

**Rationale**:
- Viteとの統合がシームレス
- Service Workerの生成・管理が自動化
- オフラインキャッシュ戦略の設定が容易

**Alternatives Considered**:
- Manual Service Worker: 開発・保守コスト高
- Create React App: Vite採用済みのため除外

## Architecture Decisions

### API Design Pattern

**Decision**: RESTful API with resource-based endpoints

**Rationale**:
- シンプルで予測可能なURL構造
- Honoのルーティングと相性が良い
- GraphQLは要件に対して過剰

### Data Sync Pattern

**Decision**: Optimistic updates with rollback

**Rationale**:
- UX向上（即座にUIに反映）
- エラー時はローカル状態をロールバック
- 複雑なCRDTは不要（単一ユーザーデータ）

### Error Handling Pattern

**Decision**: Error Boundary + Toast notifications

**Rationale**:
- クラッシュ防止とユーザーフレンドリーなエラー表示
- Constitution Principle II（次のアクションを明示）に準拠

## Security Considerations

1. **Password Hashing**: bcrypt (Cloudflare Workers対応版)
2. **CSRF Protection**: SameSite cookie + Origin check
3. **Rate Limiting**: Cloudflare Workers built-in
4. **Data Encryption**: D1 at-rest encryption (Cloudflare managed)

## Performance Considerations

1. **Bundle Splitting**: Viteの自動コード分割
2. **Lazy Loading**: ダッシュボードページを遅延読み込み
3. **API Response Caching**: React Queryのstale-while-revalidate
4. **Image Optimization**: 本アプリでは画像なし（テキストデータのみ）

## Dependencies Summary

| Package | Version | Purpose |
|---------|---------|---------|
| hono | ^4.x | Backend framework |
| drizzle-orm | ^0.30.x | Database ORM |
| zod | ^3.x | Schema validation |
| react | ^18.x | UI framework |
| @tanstack/react-query | ^5.x | Server state |
| zustand | ^4.x | Client state |
| react-hook-form | ^7.x | Form handling |
| chart.js | ^4.x | Charts |
| tailwindcss | ^3.x | Styling |
| vite-plugin-pwa | ^0.20.x | PWA support |
