# Research: 食事記録の日付別表示

**Branch**: `001-meal-history` | **Date**: 2026-01-05

## Research Tasks

### 1. カレンダーUIの実装アプローチ

**Decision**: カスタムカレンダーコンポーネントを自作

**Rationale**:
- Constitution V（Simplicity Over Cleverness）に従い、ライブラリ追加を最小限に
- 必要な機能は月間表示、日付選択、記録有無のマーカー表示のみ
- バンドルサイズへの影響を考慮し、フルスペックのカレンダーライブラリは過剰
- Tailwind CSSで既存のスタイリングと統一可能

**Alternatives considered**:
- react-calendar: 機能は豊富だが、このユースケースには過剰。バンドルサイズ増加
- date-fns + カスタムUI: date-fnsは既に使用されていない。Dateオブジェクトのみで十分
- react-day-picker: カスタマイズ性は高いが追加依存関係が発生

### 2. 日付フィルタリングの実装確認

**Decision**: 既存のuseMealsフックを活用

**Rationale**:
- `useMeals.ts`は既にstartDate/endDateオプションをサポート
- バックエンドの`/api/meals`エンドポイントもdateRangeSchemaで検証済み
- 新規実装は不要、フロントエンドの呼び出し方を変更するのみ

**Existing Implementation**:
```typescript
// packages/frontend/src/hooks/useMeals.ts (既存)
interface UseMealsOptions {
  startDate?: string;
  endDate?: string;
  mealType?: MealType;
}
```

### 3. 今日の日付計算（タイムゾーン対応）

**Decision**: 既存のtimezoneOffset送信パターンを活用

**Rationale**:
- `/api/meals/today`エンドポイントは既にtimezoneOffsetをクエリパラメータで受け取る
- フロントエンドで`new Date().getTimezoneOffset()`を使用
- サーバーサイドでユーザーのローカル日付を正確に計算可能

**Existing Pattern**:
```typescript
// packages/frontend/src/hooks/useMeals.ts (既存)
const timezoneOffset = new Date().getTimezoneOffset();
const res = await api.meals.today.$get({
  query: { timezoneOffset: String(timezoneOffset) },
});
```

### 4. 記録がある日のマーカー取得

**Decision**: 新規APIエンドポイント `/api/meals/dates` を追加

**Rationale**:
- 月間カレンダーで記録がある日をマーカー表示するには、日付リストが必要
- 全レコードを取得して日付を抽出するのは非効率
- 月ごとの記録日リストを返す軽量APIが最適

**Proposed API**:
```typescript
GET /api/meals/dates?year=2026&month=1&timezoneOffset=-540
Response: { dates: ["2026-01-01", "2026-01-03", "2026-01-05", ...] }
```

### 5. 履歴ページのルーティング

**Decision**: `/meals/history` パスで新規ページを追加

**Rationale**:
- 既存の`/meals`（今日の食事）と明確に分離
- `/meals/:mealId`（詳細ページ）とも衝突しない
- ユーザーにとって直感的なURL構造

## Summary

| Research Item | Decision | Implementation Impact |
|---------------|----------|----------------------|
| カレンダーUI | カスタム自作 | 新規コンポーネント `MealCalendar.tsx` |
| 日付フィルタ | 既存useMeals活用 | 呼び出しパラメータ変更のみ |
| タイムゾーン | 既存パターン活用 | 変更なし |
| 記録日マーカー | 新規API追加 | `GET /api/meals/dates` エンドポイント |
| ルーティング | /meals/history | router.tsx に追加 |

**Phase 0 Complete**: 全ての技術的不明点が解決済み。Phase 1に進行可能。
