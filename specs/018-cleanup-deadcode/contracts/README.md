# API Contracts: デッドコード削除とツール導入

**Feature**: [spec.md](../spec.md)
**Status**: N/A - No API contracts needed

## Overview

このフィーチャーはAPIエンドポイントの追加・変更を伴いません。契約定義は不要です。

## Rationale

- **Phase 1 (削除)**: フロントエンドコンポーネントの削除のみ。既存API（`/api/exercises`）は変更なし
- **Phase 2 (ツール導入)**: Knipは静的解析ツール。ランタイムAPIに影響なし
- **Phase 3 (CI統合)**: GitHub Actionsの設定変更。アプリケーションAPIとは無関係

## Verification

このフィーチャーの成功は以下で検証します：

- 既存のE2Eテストが引き続きパスする（API互換性の保証）
- `pnpm typecheck`でコンパイルエラーがない（型安全性の保証）
- CI統合後、デッドコード検出が正常に動作する

APIレベルの統合テストは不要です。
