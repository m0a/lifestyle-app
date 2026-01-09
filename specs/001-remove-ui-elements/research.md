# Research: 運動記録フォームと履歴表示のシンプル化

**Date**: 2026-01-09
**Feature**: 001-remove-ui-elements
**Status**: Complete

## Overview

この機能は既存のUI要素を削除するシンプルな変更であり、新規技術の導入や複雑な設計判断は不要。主な調査項目は以下の3点:

1. 既存の`recordedAt`フィールドのデフォルト値設定パターン
2. React Hook FormでのフィールドUnregister方法
3. フィルタ機能削除後のstate管理の簡素化

## Decision 1: recordedAt のデフォルト値設定

### Decision
`defaultValues`でISO文字列として現在時刻を設定し、フォーム送信時に`recordedAt`を自動的にペイロードに含める。

### Rationale
- 既存の実装を確認したところ、`ExerciseInput.tsx`で既に`defaultValues: { recordedAt: new Date().toISOString() }`が設定されている（38行目）
- react-hook-formの`defaultValues`は非表示フィールドでも送信時に値が保持される
- 日時入力フィールドを削除しても、`recordedAt`は`watch()`やフォーム送信時に自動的に含まれる
- サーバー側（`POST /api/exercises`）は既に`recordedAt`をオプショナルとして受け入れ、未指定時に現在時刻を使用する実装になっている

### Implementation Pattern
```typescript
// packages/frontend/src/components/exercise/ExerciseInput.tsx
const { register, handleSubmit, reset, setValue, watch } = useForm<CreateExerciseInput>({
  resolver: zodResolver(createExerciseSchema),
  defaultValues: {
    recordedAt: new Date().toISOString(), // ← 既存の実装を維持
  },
});

// フォーム送信時、recordedAtは自動的に含まれる
const handleFormSubmit = (data: CreateExerciseInput) => {
  onSubmit({
    ...data,
    recordedAt: data.recordedAt || new Date().toISOString(), // fallback
  });
};
```

### Alternatives Considered
1. **フォーム送信時に動的生成**: `handleFormSubmit`内で`recordedAt`を上書き
   - **Rejected**: 既存の`defaultValues`パターンで十分機能する。余分なコードを追加する必要なし
2. **サーバー側のみで生成**: フロントエンドから`recordedAt`を送信しない
   - **Rejected**: クライアント時刻を記録することで、タイムゾーンや記録タイミングの正確性を保証

## Decision 2: 日時入力フィールドの削除方法

### Decision
JSXから`<input type="datetime-local">`要素を削除するのみ。`register('recordedAt')`の呼び出しは不要（`defaultValues`で値が保持される）。

### Rationale
- react-hook-formでは、`register()`を呼び出さなくても`defaultValues`で設定した値はフォーム送信時に含まれる
- 既存コード（ExerciseInput.tsx:150-160）では、日時フィールドに`{...register('recordedAt')}`が設定されているが、これを削除しても`defaultValues`の値は保持される
- TypeScript strict modeでエラーが発生しないことを確認（`CreateExerciseInput`型で`recordedAt`はオプショナル）

### Implementation Pattern
```typescript
// Before (packages/frontend/src/components/exercise/ExerciseInput.tsx:147-160)
<div>
  <label htmlFor="recordedAt" className="block text-sm font-medium text-gray-700">
    記録日時
  </label>
  <input
    {...register('recordedAt')}
    type="datetime-local"
    id="recordedAt"
    defaultValue={new Date().toISOString().slice(0, 16)}
    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
  />
  {errors.recordedAt && (
    <p className="mt-1 text-sm text-red-600">{errors.recordedAt.message}</p>
  )}
</div>

// After: この div 全体を削除
// （defaultValues で recordedAt は保持されるため、register 不要）
```

### Alternatives Considered
1. **hidden inputとして保持**: `<input type="hidden" {...register('recordedAt')} />`
   - **Rejected**: 不要な要素を追加することになり、シンプルさに反する
2. **useEffectで値を設定**: `useEffect(() => setValue('recordedAt', new Date().toISOString()), [])`
   - **Rejected**: `defaultValues`で十分。余分なコードを追加する必要なし

## Decision 3: フィルタ機能の削除とstate管理の簡素化

### Decision
`Exercise.tsx`から`filterType` stateと関連するUIを削除し、`useExercises()`の呼び出しからパラメータを削除する。

### Rationale
- 既存の実装（Exercise.tsx:10, 30）では、`filterType` stateが`useExercises({ exerciseType: filterType || undefined })`に渡されている
- フィルタUIを削除する場合、`filterType` stateは不要になる
- `useExercises()`のインターフェースは変更不要（オプショナルパラメータのため、省略可能）
- `allExerciseTypes` stateとその更新ロジック（33-38行目）も不要になる

### Implementation Pattern
```typescript
// Before (packages/frontend/src/pages/Exercise.tsx:10-38)
const [filterType, setFilterType] = useState<string>('');
const [allExerciseTypes, setAllExerciseTypes] = useState<string[]>([]);

const { exercises, ... } = useExercises({ exerciseType: filterType || undefined });

useEffect(() => {
  if (!filterType && exercises.length > 0) {
    const types = [...new Set(exercises.map((e) => e.exerciseType))].sort();
    setAllExerciseTypes(types);
  }
}, [exercises, filterType]);

// After: state 削除、パラメータなしで useExercises を呼び出し
const { exercises, ... } = useExercises(); // パラメータなし = すべて表示
```

```typescript
// Before (packages/frontend/src/pages/Exercise.tsx:100-113)
{allExerciseTypes.length > 0 && (
  <select
    value={filterType}
    onChange={(e) => setFilterType(e.target.value)}
    className="..."
  >
    <option value="">すべての種目</option>
    {allExerciseTypes.map((type) => (
      <option key={type} value={type}>{type}</option>
    ))}
  </select>
)}

// After: この条件分岐全体を削除
```

### Alternatives Considered
1. **フィルタ機能を無効化して保持**: UIを非表示にするが、コードは残す
   - **Rejected**: 不要なコードを残すことは保守性を下げる。完全に削除すべき
2. **useExercisesのインターフェース変更**: パラメータを完全に削除
   - **Rejected**: 他の場所で使用される可能性があるため、インターフェースは保持（今回は呼び出し側のみ変更）

## Decision 4: 編集機能での日時保持

### Decision
既存の編集機能（ExerciseList.tsx内のインライン編集）は変更せず、`recordedAt`フィールドは編集不可として保持する。

### Rationale
- 仕様（FR-005）で「記録編集時に、元の記録日時を保持し、編集時刻で上書きしてはならない」と明記されている
- 既存のExerciseList.tsxでは、編集時に`sets`と`reps`のみ変更可能で、`recordedAt`は編集対象外
- 変更不要のため、調査対象から除外

### Implementation Pattern
既存コードを維持（変更なし）

## Testing Strategy

### Unit Tests (Vitest)
- **ExerciseInput.test.tsx**:
  - 日時入力フィールドが表示されないことを確認
  - フォーム送信時に`recordedAt`が現在時刻（±1秒の許容範囲）で設定されることを確認
  - `defaultValues`が正しく機能することを確認

### Integration Tests (Vitest)
- **exercise-api.test.ts**:
  - `POST /api/exercises`で`recordedAt`を省略した場合、サーバー側で現在時刻が設定されることを確認
  - クライアントから`recordedAt`を送信した場合、その値が保持されることを確認

### E2E Tests (Playwright)
- **exercise-recording.spec.ts**:
  - 運動記録ページで日時入力フィールドが表示されないことを確認
  - 記録ボタンをクリック後、履歴に現在時刻で記録が表示されることを確認
  - フィルタUIが表示されないことを確認
  - すべての種目の記録が混在して時系列表示されることを確認

## Performance Considerations

### UI Rendering
- **Before**: 4入力フィールド + 1フィルタドロップダウン = 5 DOM要素
- **After**: 3入力フィールド = 3 DOM要素
- **Impact**: レンダリングコスト微減（実質的な影響は極小）

### State Management
- **Before**: `filterType`, `allExerciseTypes`, `exercises` の3 state
- **After**: `exercises` の1 state
- **Impact**: useEffect削除により再レンダリング回数減少

### User Interaction Time
- **Before**: 種目選択 → 数値入力 → 日時選択 → 記録ボタン = 4ステップ
- **After**: 種目選択 → 数値入力 → 記録ボタン = 3ステップ
- **Expected**: 25-30%の時間短縮（仕様SC-005）

## Migration & Rollback Plan

### Migration
不要（UIの削除のみで、データ移行なし）

### Rollback
- フィーチャーブランチを削除し、mainにマージしない
- またはGit revertで変更を元に戻す
- データ損失リスク: なし（既存のrecordedAtフィールドは保持）

## Summary

すべての調査完了。既存の実装パターンを活用し、以下の方針で実装を進める:

1. ✅ `defaultValues`で`recordedAt`を自動設定（既存パターン継続）
2. ✅ 日時入力フィールドのJSXを削除（`register`呼び出し不要）
3. ✅ `filterType` stateとフィルタUIを削除（`useExercises()`はパラメータなしで呼び出し）
4. ✅ 編集機能は変更なし（`recordedAt`は編集対象外として保持）

新規技術導入なし。既存のReact Hook Form、Zod、TanStack Queryパターンを維持。
