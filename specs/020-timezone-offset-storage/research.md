# Research: Timezone Offset Storage

**Feature**: 020-timezone-offset-storage
**Date**: 2026-01-18

## Research Topics

### 1. ISO 8601 Timezone Offset Format

**Decision**: `YYYY-MM-DDTHH:mm:ss±HH:mm` 形式を使用

**Rationale**:
- ISO 8601 標準に準拠
- JavaScript の `Date` オブジェクトでネイティブにパース可能
- 文字列の先頭10文字がローカル日付を表す（`YYYY-MM-DD`）

**Alternatives considered**:
- IANA タイムゾーン名（`Asia/Tokyo`）: オフセットが動的に変わるため不適切
- Unix timestamp + 別カラムでTZ: 複雑化、スキーマ変更必要

### 2. date-fns-tz でのオフセット付き文字列生成

**Decision**: `formatInTimeZone` を使用

```typescript
import { formatInTimeZone } from 'date-fns-tz';

const toLocalISOString = (date: Date) => {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return formatInTimeZone(date, tz, "yyyy-MM-dd'T'HH:mm:ssXXX");
};
// → "2026-01-17T08:00:00+09:00"
```

**Rationale**:
- バックエンドで既に date-fns-tz を使用中
- `XXX` トークンが ISO 8601 オフセット形式を出力
- tree-shaking でバンドルサイズ影響は最小（~5KB）

**Alternatives considered**:
- 手動でオフセット文字列を構築: エラーが起きやすい
- Luxon: バンドルサイズが大きい（~20KB）
- Day.js: date-fns との混在は避けたい

### 3. SQLite マイグレーション戦略

**Decision**: 単純な UPDATE 文で一括変換

```sql
-- weight_records
UPDATE weight_records
SET recorded_at = strftime('%Y-%m-%dT%H:%M:%S', datetime(recorded_at, '+9 hours')) || '+09:00'
WHERE recorded_at LIKE '%Z';

-- meal_records
UPDATE meal_records
SET recorded_at = strftime('%Y-%m-%dT%H:%M:%S', datetime(recorded_at, '+9 hours')) || '+09:00'
WHERE recorded_at LIKE '%Z';

-- exercise_records
UPDATE exercise_records
SET recorded_at = strftime('%Y-%m-%dT%H:%M:%S', datetime(recorded_at, '+9 hours')) || '+09:00'
WHERE recorded_at LIKE '%Z';
```

**Rationale**:
- 全データが `Z` 形式で統一されているため、条件分岐不要
- SQLite の `strftime` と `datetime` で時刻計算可能
- スキーマ変更なし（TEXT カラムの値形式のみ変更）

**Alternatives considered**:
- アプリケーションレベルでの変換: 遅い、トランザクション管理が複雑
- 新カラム追加: 不要な複雑さ

### 4. Zod スキーマでのオフセット必須化

**Decision**: 正規表現で `Z` または `±HH:mm` を必須にする

```typescript
const datetimeSchema = z.string().refine((val) => {
  // Z または +/-HH:mm を必須にする
  return val.includes('Z') || /[+-]\d{2}:\d{2}$/.test(val);
}, { message: 'Timezone offset required (e.g., +09:00 or Z)' });
```

**Rationale**:
- API レベルでオフセットなしデータを拒否
- 既存の変換ロジック（datetime-local → toISOString）を段階的に移行

**Alternatives considered**:
- datetime-local 入力時に自動オフセット付与: フロントエンド側の責務として実装

### 5. 表示時の日付抽出

**Decision**: 文字列操作 `slice(0, 10)` でローカル日付を抽出

```typescript
const extractLocalDate = (recordedAt: string) => {
  return recordedAt.slice(0, 10); // "2026-01-17"
};
```

**Rationale**:
- オフセット付き ISO 形式では先頭10文字がローカル日付
- Date オブジェクト変換不要（パフォーマンス向上）
- タイムゾーン変換ライブラリ不要（シンプル化）

**Alternatives considered**:
- `date-fns` でパース: 不要なオーバーヘッド

### 6. PR #65 の削除対象コード

**Decision**: 以下のコードを削除

1. `useActivityDots.ts`: `timezone` パラメータ送信
2. `useMeals.ts`: `getUserTimezone()` 関数、`timezone` パラメータ送信
3. `dashboard.ts` (route): `timezone` クエリパラメータ
4. `dashboard.ts` (service): `toZonedTime` による日付変換

**Rationale**:
- オフセット付き保存により、表示時の TZ 送信が不要になる
- コード量削減、API シンプル化

## Summary

| Topic | Decision | Impact |
|-------|----------|--------|
| 日時形式 | ISO 8601 + オフセット | 標準準拠 |
| ライブラリ | date-fns-tz | バックエンドと統一 |
| マイグレーション | SQL UPDATE | シンプル、高速 |
| バリデーション | Zod refine | API レベルで強制 |
| 日付抽出 | slice(0,10) | 高速、シンプル |
| 削除コード | PR #65 のTZ送信 | コード削減 |

**All NEEDS CLARIFICATION resolved**: ✅
