# Feature Specification: デッドコード削除とツール導入

**Feature ID**: 018-cleanup-deadcode
**Created**: 2026-01-09
**Status**: Draft
**Related Issue**: #44

## Overview

コードベース内の未使用コンポーネント（ExerciseInput.tsx）を削除し、将来のデッドコード発生を防ぐためのツール（ts-prune）を導入します。これにより、コードベースの保守性向上、バンドルサイズの削減、開発者の混乱防止を実現します。

## Clarifications

### Session 2026-01-09

- Q: デッドコード検出結果をどのように記録・追跡するか？ → A: 検出結果をCIログに記録し、PRコメントで通知する
- Q: ドキュメントの追記先はCLAUDE.mdとREADME.mdのどちらか？ → A: CLAUDE.md に追記する
- Q: Phase 3（CI統合）の実施タイミングはいつか？ → A: Phase 2と同時に実施する
- Q: デッドコード検出時のマージポリシーは？ → A: 閾値を設定してブロックし、段階的に厳しくする（初期: 10個以上でブロック、目標: 0個）

## Background & Problem Statement

### 現状の問題

PR #43の実装時、開発者が誤ってExerciseInput.tsxを編集しましたが、このファイルは実際には使われておらず、変更が反映されませんでした。この問題により、以下の課題が明らかになりました：

1. **デッドコードの存在**: ExerciseInput.tsxはコミットa2caf2bでStrengthInput.tsxに置き換えられたが、削除されず残っている
2. **開発者の混乱**: 類似した名前のコンポーネントが複数存在し、どれが実際に使われているか不明瞭
3. **バンドルサイズの増加**: 使われていないコードがバンドルに含まれる可能性
4. **保守性の低下**: 新規メンバーが理解しづらいコードベース

### ビジネスへの影響

- 開発速度の低下（間違ったファイルを編集するリスク）
- コードレビューの負担増加
- バンドルサイズの肥大化による配信コスト増加

## User Scenarios & Testing

### User Scenario 1: デッドコード削除

**Actor**: 開発者
**Goal**: 未使用のコンポーネントを削除し、コードベースをクリーンに保つ

**Steps**:
1. 開発者が未使用のExerciseInput.tsxを削除する
2. 型チェック（`pnpm typecheck`）を実行し、エラーがないことを確認する
3. ビルド（`pnpm build`）を実行し、成功することを確認する
4. アプリケーションが正常に動作することを確認する

**Expected Outcome**:
- ExerciseInput.tsxが削除される
- 既存機能（運動記録フォーム）が正常に動作する
- ビルドサイズが削減される

### User Scenario 2: デッドコード検出ツール導入

**Actor**: 開発者
**Goal**: 将来のデッドコード発生を防ぐため、自動検出ツールを導入する

**Steps**:
1. 開発者がts-pruneをdevDependenciesに追加する
2. package.jsonに`find-deadcode`スクリプトを追加する
3. `pnpm find-deadcode`を実行する
4. 未使用のエクスポートがあれば一覧表示される

**Expected Outcome**:
- ts-pruneが正常にインストールされる
- `pnpm find-deadcode`コマンドで未使用コードを検出できる
- 検出結果が読みやすい形式で表示される

### User Scenario 3: 継続的なデッドコードチェック

**Actor**: CI/CDパイプライン
**Goal**: プルリクエスト作成時に自動的にデッドコードをチェックし、閾値を超えた場合はマージをブロックする（Phase 2と同時実施）

**Steps**:
1. CI設定ファイル（.github/workflows/ci.yml）にデッドコードチェックジョブを追加する（初期閾値: 10個）
2. プルリクエストが作成される
3. CIがデッドコードチェックを実行し、未使用エクスポートをカウントする
4. 検出数が閾値以上の場合、CIが失敗する
5. 検出数が閾値未満の場合、警告のみでCI成功

**Expected Outcome**:
- CIパイプラインでデッドコードチェックが実行される
- デッドコードが閾値を超えた場合、マージがブロックされる
- 閾値未満の場合は警告のみで開発者に通知される
- PRコメントに検出数と現在の閾値が表示される

## Functional Requirements

### Phase 1: デッドコード削除（必須）

**FR-001**: ExerciseInput.tsx削除
未使用のコンポーネントファイル `packages/frontend/src/components/exercise/ExerciseInput.tsx` を削除する。

**Acceptance Criteria**:
- ファイルが削除されている
- `git status`でファイルが削除として表示される

**FR-002**: 削除後の動作確認
ExerciseInput.tsx削除後も、アプリケーションが正常に動作することを確認する。

**Acceptance Criteria**:
- `pnpm typecheck`がエラーなく完了する
- `pnpm build`が成功する
- 運動記録フォーム（StrengthInput.tsx使用）が正常に表示・動作する
- 既存のE2Eテストがすべてパスする

### Phase 2: ツール導入（必須）

**FR-003**: ts-prune導入
デッドコード検出ツールts-pruneをdevDependenciesに追加する。

**Acceptance Criteria**:
- `pnpm add -D ts-prune`が実行されている
- package.jsonのdevDependenciesにts-pruneが含まれている
- pnpm-lock.yamlが更新されている

**FR-004**: デッドコード検出スクリプト追加
package.jsonにデッドコード検出用のスクリプトコマンドを追加する。

**Acceptance Criteria**:
- package.jsonのscriptsセクションに`"find-deadcode": "ts-prune"`が追加されている
- `pnpm find-deadcode`コマンドが実行できる
- コマンド実行時、未使用のエクスポートが一覧表示される

**FR-005**: ドキュメント更新
CLAUDE.mdにデッドコード検出の使い方を追記する。

**Acceptance Criteria**:
- CLAUDE.mdにデッドコード検出コマンドの使い方が記載されている
- ts-pruneの目的と使用方法が説明されている
- 実行例（`pnpm find-deadcode`）が含まれている
- CI閾値の現在値と段階的引き下げ計画が記載されている（初期: 10個 → 目標: 0個）
- 既存のコマンドセクションに適切に統合されている

### Phase 3: CI統合（Phase 2と同時実施）

**FR-006**: CI統合
CIパイプラインでデッドコードチェックを実行する。Phase 2のツール導入と同時に実施する。

**Acceptance Criteria**:
- .github/workflows/ci.ymlにデッドコードチェックジョブが追加されている
- 初期閾値を10個に設定：未使用エクスポートが10個以上の場合、CIが失敗しマージがブロックされる
- 閾値未満の場合は警告のみでマージ可能
- デッドコード検出結果がCIログに記録される
- 検出結果がPRコメントとして自動投稿される（未使用エクスポートの一覧と現在の閾値を含む）
- 閾値を段階的に引き下げる計画がドキュメント化されている（目標: 0個）

## Success Criteria

### Phase 1成功基準

1. **コード削減**: 未使用コード約150行が削除され、コードベースが5%簡潔になる
2. **機能維持**: 削除後も運動記録機能が100%正常に動作し、ユーザー体験に影響がない
3. **品質維持**: すべての自動テストがパスし、コード品質基準を満たす

### Phase 2成功基準

1. **検出機能**: 開発者が単一コマンドで未使用コードを5秒以内に特定できる
2. **検出精度**: 実際の未使用コードの90%以上を正確に検出する
3. **開発効率**: 開発者がコードレビュー前に未使用コードを自己チェックできる

### Phase 3成功基準

1. **自動化**: すべてのプルリクエストで自動的にデッドコードチェックが実行される
2. **可視性**: 未使用コードが検出された場合、開発者に即座に通知される（PRコメント経由）
3. **品質ゲート**: デッドコードが初期閾値（10個）を超えた場合、マージがブロックされる
4. **段階的強化**: 閾値を段階的に引き下げる計画が文書化されている（最終目標: 0個）
5. **同時実施**: Phase 2のツール導入と同じPRでCI統合が完了する

## Key Entities

### ExerciseInput Component（削除対象）
- **File Path**: `packages/frontend/src/components/exercise/ExerciseInput.tsx`
- **Status**: 未使用（コミットa2caf2bでStrengthInput.tsxに置き換え）
- **Dependencies**: なし（どこからもimportされていない）
- **Type**: Reactコンポーネント

### StrengthInput Component（現行使用中）
- **File Path**: `packages/frontend/src/components/exercise/StrengthInput.tsx`
- **Status**: 使用中
- **Used By**: `packages/frontend/src/pages/Exercise.tsx`
- **Type**: Reactコンポーネント

## Scope

### In Scope
- ExerciseInput.tsxの削除（Phase 1）
- ts-pruneの導入とスクリプト設定（Phase 2）
- ドキュメント更新（CLAUDE.mdへの追記）（Phase 2）
- CI統合（Phase 2と同時実施）

### Out of Scope
- 他のデッドコードの削除（ts-pruneで検出されたものは別タスク）
- knipやeslint-plugin-unused-importsの導入（将来的に検討）
- バックエンドのデッドコード検出
- 既存コンポーネントのリファクタリング

## Dependencies & Assumptions

### Dependencies
- TypeScript 5.3+がインストールされている
- pnpmがパッケージマネージャーとして使用されている
- 既存のCI/CDパイプラインが機能している

### Assumptions
- ExerciseInput.tsxは本当にどこからも使われていない（grep検証済み）
- ts-pruneはモノレポ構成で正常に動作する
- 開発者はpnpmコマンドに慣れている
- CIパイプラインにジョブを追加する権限がある

## Risks & Mitigations

### Risk 1: 誤削除の可能性
**Description**: 削除対象のファイルが実は使われている可能性
**Likelihood**: Low
**Impact**: High
**Mitigation**:
- 削除前にコードベース全体で使用箇所を検索し確認する
- 自動テストで依存関係と機能が正常であることを検証する
- 段階的な削除プロセスを実施する

### Risk 2: ツールの誤検出によるマージブロック
**Description**: デッドコード検出ツールが実際に使われているコードを誤って未使用と判定し、正当なPRがブロックされる可能性
**Likelihood**: Medium
**Impact**: Medium
**Mitigation**:
- 検出結果を開発者が手動でレビューする
- 初期閾値を10個に設定し、少量の誤検出を許容する
- 除外パターンを設定して誤検出を最小化する
- 緊急時は閾値を一時的に引き上げる手順を用意する

### Risk 3: ツールの互換性問題
**Description**: デッドコード検出ツールがプロジェクト構成で正常に動作しない可能性
**Likelihood**: Low
**Impact**: Medium
**Mitigation**:
- プロジェクトの各部分で個別にツールを実行できるよう設定する
- 動作しない場合は代替ツールへの移行を検討する
- 導入前に小規模なテスト実行で動作を確認する

## References

- Issue #44: https://github.com/m0a/lifestyle-app/issues/44
- PR #43: 運動記録UIの簡素化
- ts-prune: https://github.com/nadeesha/ts-prune
- Commit a2caf2b: StrengthInput.tsx導入
- Commit 39e6964: ExerciseInput.tsx導入（当時）
