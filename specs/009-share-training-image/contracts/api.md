# API Contracts: トレーニング画像共有機能

**Date**: 2026-01-02
**Feature**: 009-share-training-image

## 新規エンドポイント

### GET /api/exercises/max-rm

種目ごとの歴代最高1RMを取得する。

#### Request

```
GET /api/exercises/max-rm?exerciseTypes=ベンチプレス,スクワット
Authorization: Bearer <token>
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| exerciseTypes | string | No | カンマ区切りの種目名リスト。省略時は全種目 |

#### Response

**Success (200)**:

```json
{
  "maxRMs": [
    {
      "exerciseType": "ベンチプレス",
      "maxRM": 100,
      "achievedAt": "2026-01-01T10:00:00.000Z"
    },
    {
      "exerciseType": "スクワット",
      "maxRM": 150,
      "achievedAt": "2025-12-28T09:30:00.000Z"
    }
  ]
}
```

**Empty (200)** - 記録がない場合:

```json
{
  "maxRMs": []
}
```

#### Zod Schema

```typescript
// Request
const maxRMQuerySchema = z.object({
  exerciseTypes: z.string().optional(), // カンマ区切り
});

// Response
const maxRMRecordSchema = z.object({
  exerciseType: z.string(),
  maxRM: z.number(),
  achievedAt: z.string().datetime(),
});

const maxRMResponseSchema = z.object({
  maxRMs: z.array(maxRMRecordSchema),
});
```

---

## 既存エンドポイントの使用

### GET /api/exercises

既存エンドポイントを画像生成時に使用。

#### Request（画像生成用）

```
GET /api/exercises?startDate=2026-01-02&endDate=2026-01-02
Authorization: Bearer <token>
```

#### Response（既存形式）

```json
{
  "exercises": [
    {
      "id": "xxx",
      "exerciseType": "ベンチプレス",
      "muscleGroup": "chest",
      "setNumber": 1,
      "reps": 10,
      "weight": 60,
      "variation": null,
      "recordedAt": "2026-01-02T10:00:00.000Z"
    }
  ]
}
```

---

## フロントエンド内部インターフェース

### TrainingImageData（画像生成用）

APIレスポンスをこの形式に変換して画像コンポーネントに渡す。

```typescript
interface TrainingImageData {
  date: string;
  title: string;
  exercises: ExerciseCardData[];
  footer: string;
}

interface ExerciseCardData {
  exerciseType: string;
  maxRM: number;
  sets: SetDetailData[];
}

interface SetDetailData {
  setNumber: number;
  weight: number;
  reps: number;
  estimated1RM: number;
  isMaxRM: boolean;
}
```

### 変換フロー

```
[GET /api/exercises] + [GET /api/exercises/max-rm]
            ↓
    transformToImageData()
            ↓
    TrainingImageData
            ↓
    <TrainingImagePreview />
```

---

## エラーハンドリング

### API エラー

| Status | Description | クライアント対応 |
|--------|-------------|-----------------|
| 401 | 未認証 | ログイン画面へリダイレクト |
| 404 | 記録なし | 「記録がありません」表示 |
| 500 | サーバーエラー | リトライ促すメッセージ |

### 画像生成エラー

| Error | Description | 対応 |
|-------|-------------|------|
| DOM rendering failed | html-to-image失敗 | リトライ（最大3回） |
| Blob creation failed | Blob生成失敗 | エラーメッセージ表示 |

### 共有エラー

| Error | Description | 対応 |
|-------|-------------|------|
| AbortError | ユーザーキャンセル | 何もしない（正常） |
| NotAllowedError | 権限なし | ダウンロードにフォールバック |
| TypeError | API非対応 | ダウンロードにフォールバック |
