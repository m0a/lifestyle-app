# Data Model: デッドコード削除とツール導入

**Feature**: [spec.md](./spec.md)
**Status**: N/A - No data model changes

## Overview

このフィーチャーはデータモデルの変更を伴いません。既存のコード削除とツール導入のみです。

## Entities

**None** - データベーススキーマ、API型定義、ストレージ構造への変更はありません。

## Database Schema Changes

**None** - マイグレーションは不要です。

## Rationale

- **削除対象**: `ExerciseInput.tsx` はフロントエンドのReactコンポーネント（UIのみ、データ無関係）
- **ツール導入**: Knipは開発時の静的解析ツール（ランタイムデータに影響なし）
- **CI統合**: GitHub Actionsワークフロー設定の追加（メタデータのみ）

このフィーチャーはコードベースのクリーンアップと開発ツールの改善であり、アプリケーションのデータ層には一切影響しません。
