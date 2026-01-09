# Implementation Plan: デッドコード削除とツール導入

**Branch**: `018-cleanup-deadcode` | **Date**: 2026-01-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/018-cleanup-deadcode/spec.md`

## Summary

未使用のコンポーネント（ExerciseInput.tsx）を削除し、将来のデッドコード蓄積を防ぐためにts-pruneツールを導入する。CI統合により、未使用エクスポートが閾値（初期: 10個）を超えた場合、マージをブロックする品質ゲートを実装する。段階的に閾値を0個まで引き下げることで、コードベースの完全なクリーン化を目指す。

## Technical Context

**Language/Version**: TypeScript 5.3 (strict mode)
**Primary Dependencies**:
- ts-prune (デッドコード検出)
- 既存: pnpm, TypeScript, ESLint
**Storage**: N/A（設定ファイルのみ変更）
**Testing**:
- Vitest（既存テストスイートの実行確認）
- Playwright（E2Eテストの実行確認）
**Target Platform**:
- Node.js 20+ (開発環境)
- GitHub Actions (CI環境)
**Project Type**: Monorepo (pnpm workspaces)
**Performance Goals**:
- デッドコード検出: 5秒以内
- CI実行時間の増加: 30秒以内
**Constraints**:
- 既存機能への影響ゼロ（運動記録フォームが正常動作）
- バンドルサイズ削減: 150行分
**Scale/Scope**:
- 削除対象: 1ファイル（ExerciseInput.tsx）
- モノレポ: 3パッケージ（frontend, backend, shared）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Gate 1: User Privacy First ✅ PASS
**Assessment**: このフィーチャーはコードベースの保守性改善であり、ユーザーデータには触れない。プライバシーへの影響はゼロ。

**Rationale**: デッドコード削除とツール導入は開発者体験の改善であり、ユーザーデータの収集・保存・共有には一切関与しない。

### Gate 2: Simple UX ✅ PASS
**Assessment**: ユーザー向け機能の変更なし。削除対象（ExerciseInput.tsx）は既に未使用であり、ユーザー体験への影響はゼロ。

**Rationale**: ExerciseInput.tsxは過去に使われていたが、現在はStrengthInput.tsxに置き換わっている。削除しても既存のユーザー体験は一切変わらない。

### Gate 3: Test-Driven Development (TDD) ⚠️ PARTIAL
**Assessment**:
- ✅ E2Eテストで既存機能（StrengthInput使用）を検証済み
- ⚠️ ts-prune導入に対する新規テストは不要（ツールの出力を検証するのは過剰）
- ✅ 削除後の型チェック・ビルドで品質を保証

**Rationale**: デッドコード削除の検証は、既存のテストスイート実行で十分。ts-pruneの動作は本プロジェクトの責任範囲外（外部ツール）。

**Justification for Partial**: ツール導入フェーチャーにおいて、ツール自体の動作をテストする必要はない。統合後の効果（デッドコード検出）は手動確認で十分。

### Gate 4: Type Safety ✅ PASS
**Assessment**: TypeScript strict modeでの型チェックで、削除によるbreak

ing changeがないことを保証。

**Rationale**: ExerciseInput.tsxが本当に未使用であることは、型チェックエラーの有無で確実に検証できる。

### Gate 5: Simplicity Over Cleverness ✅ PASS
**Assessment**:
- ✅ 機能追加ではなく削除（複雑さの除去）
- ✅ ts-prune: 設定不要で即使用可能なシンプルなツール
- ✅ CI統合: 既存ワークフローへの最小限の追加（1ジョブ）

**Rationale**: このフィーチャーは複雑さを減らすことが目的。YAGNIの精神に完全に合致（不要なコードを削除）。

### Summary
- **PASS**: 4 gates
- **PARTIAL**: 1 gate (TDD - ツール導入における過剰なテストを回避)
- **FAIL**: 0 gates

**Proceed to Phase 0**: ✅ YES

## Project Structure

### Documentation (this feature)

```text
specs/018-cleanup-deadcode/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0: ts-prune best practices, CI integration patterns
├── data-model.md        # Phase 1: N/A (no data model changes)
├── quickstart.md        # Phase 1: Developer guide for deadcode detection
├── contracts/           # Phase 1: N/A (no API contracts)
│   └── README.md        # Placeholder explaining no contracts needed
└── tasks.md             # Phase 2: Task breakdown (created by /speckit.tasks)
```

### Source Code (repository root)

```text
packages/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── exercise/
│   │   │       ├── ExerciseInput.tsx  # 🗑️ DELETE THIS FILE
│   │   │       └── StrengthInput.tsx  # ✅ Keep (currently used)
│   │   └── pages/
│   │       └── Exercise.tsx           # ✅ Uses StrengthInput.tsx
│   ├── package.json                   # 📝 Add "find-deadcode" script
│   └── tests/
│       └── e2e/
│           └── exercise-recording.spec.ts  # ✅ Verify after deletion
├── backend/
│   └── package.json                   # 📝 Add "find-deadcode" script
├── shared/
│   └── package.json                   # 📝 Add "find-deadcode" script
└── package.json                       # 📝 Add root "find-deadcode" script

.github/
└── workflows/
    └── ci.yml                         # 📝 Add deadcode-check job

CLAUDE.md                              # 📝 Add deadcode detection documentation

tests/
└── e2e/
    └── exercise-recording.spec.ts     # ✅ Run to verify no regression
```

**Structure Decision**: 既存のpnpm monorepo構造を維持。変更は以下の3箇所のみ：
1. **削除**: `packages/frontend/src/components/exercise/ExerciseInput.tsx`
2. **追加**: package.jsonスクリプト（各パッケージ + root）
3. **追加**: CI設定（.github/workflows/ci.yml）
4. **更新**: CLAUDE.md（ドキュメント）

## Complexity Tracking

**No violations requiring justification.**

すべてのConstitution Gatesをパスしているため、複雑さの追加はない。唯一のPartial判定（TDD）は、ツール導入における過剰なテスト作成を回避する正当な理由がある。
