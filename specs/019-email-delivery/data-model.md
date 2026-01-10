# Data Model: Email Delivery System

**Date**: 2026-01-10
**Feature**: 019-email-delivery
**Phase**: 1 - Data Design

## Overview

メール配信システムのデータベーススキーマ設計。トークン管理、メール送信ログ、レート制限、ユーザー確認状態を含む。Cloudflare D1 (SQLite) で実装。

---

## Entity Relationship Diagram

```
users (既存)
  ├── email_verified (新規列)
  ├── created_at
  └── email

password_reset_tokens (新規)
  ├── id (PK)
  ├── user_id (FK → users)
  ├── token (unique)
  ├── expires_at
  ├── used_at (nullable)
  └── created_at

email_verification_tokens (新規)
  ├── id (PK)
  ├── user_id (FK → users)
  ├── email (確認対象メールアドレス)
  ├── token (unique)
  ├── expires_at
  ├── used_at (nullable)
  └── created_at

email_change_requests (新規)
  ├── id (PK)
  ├── user_id (FK → users)
  ├── old_email
  ├── new_email
  ├── token (unique)
  ├── status (pending/completed/cancelled)
  ├── expires_at
  └── created_at

email_delivery_logs (新規)
  ├── id (PK)
  ├── user_id (FK → users, nullable)
  ├── email_type (password_reset/email_verification/email_change)
  ├── recipient_email
  ├── status (success/failed)
  ├── error_message (nullable)
  ├── retry_count
  └── created_at

email_rate_limits (新規)
  ├── ip (PK)
  ├── count
  └── expires_at
```

---

## Tables

### 1. users (既存テーブル - 拡張)

**Description**: ユーザーアカウント。メール確認状態を追加。

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | ユーザーID |
| email | TEXT | UNIQUE, NOT NULL | メールアドレス |
| email_verified | INTEGER | DEFAULT 0 | メール確認済み (0=未確認, 1=確認済み) |
| created_at | INTEGER | NOT NULL | 登録日時 (UNIX timestamp ms) |
| ... | ... | ... | 他の既存列 |

**Migration**: `0022_user_email_verified.sql`
```sql
ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0 NOT NULL;
CREATE INDEX idx_users_email_verified ON users(email_verified);
CREATE INDEX idx_users_created_at ON users(created_at); -- 未確認アカウント削除用
```

---

### 2. password_reset_tokens (新規)

**Description**: パスワードリセットトークン。有効期限24時間、一度のみ使用可能。

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | トークンID |
| user_id | INTEGER | NOT NULL, FOREIGN KEY → users(id) | ユーザーID |
| token | TEXT | UNIQUE, NOT NULL | 32文字トークン (base64url) |
| expires_at | INTEGER | NOT NULL | 有効期限 (UNIX timestamp ms) |
| used_at | INTEGER | NULL | 使用日時 (NULL=未使用) |
| created_at | INTEGER | NOT NULL | 作成日時 (UNIX timestamp ms) |

**Indexes**:
```sql
CREATE UNIQUE INDEX idx_password_reset_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_expires_at ON password_reset_tokens(expires_at);
```

**Validation Rules**:
- `token`: 32文字、base64url形式、ユニーク
- `expires_at`: created_at + 24時間
- `used_at`: 使用後に更新、再利用防止

**Migration**: `0020_password_reset_tokens.sql`

---

### 3. email_verification_tokens (新規)

**Description**: メールアドレス確認トークン。有効期限48時間、一度のみ使用可能。

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | トークンID |
| user_id | INTEGER | NOT NULL, FOREIGN KEY → users(id) | ユーザーID |
| email | TEXT | NOT NULL | 確認対象メールアドレス |
| token | TEXT | UNIQUE, NOT NULL | 32文字トークン (base64url) |
| expires_at | INTEGER | NOT NULL | 有効期限 (UNIX timestamp ms) |
| used_at | INTEGER | NULL | 使用日時 (NULL=未使用) |
| created_at | INTEGER | NOT NULL | 作成日時 (UNIX timestamp ms) |

**Indexes**:
```sql
CREATE UNIQUE INDEX idx_email_verification_token ON email_verification_tokens(token);
CREATE INDEX idx_email_verification_user_id ON email_verification_tokens(user_id);
CREATE INDEX idx_email_verification_expires_at ON email_verification_tokens(expires_at);
```

**Validation Rules**:
- `token`: 32文字、base64url形式、ユニーク
- `email`: 有効なメールアドレス形式
- `expires_at`: created_at + 48時間
- `used_at`: 使用後に更新、再利用防止

**Migration**: `0020_email_verification_tokens.sql`

---

### 4. email_change_requests (新規)

**Description**: メールアドレス変更リクエスト。有効期限24時間、ステータス管理。

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | リクエストID |
| user_id | INTEGER | NOT NULL, FOREIGN KEY → users(id) | ユーザーID |
| old_email | TEXT | NOT NULL | 現在のメールアドレス |
| new_email | TEXT | NOT NULL | 新しいメールアドレス |
| token | TEXT | UNIQUE, NOT NULL | 32文字トークン (base64url) |
| status | TEXT | NOT NULL | ステータス (pending/completed/cancelled) |
| expires_at | INTEGER | NOT NULL | 有効期限 (UNIX timestamp ms) |
| created_at | INTEGER | NOT NULL | 作成日時 (UNIX timestamp ms) |

**Indexes**:
```sql
CREATE UNIQUE INDEX idx_email_change_token ON email_change_requests(token);
CREATE INDEX idx_email_change_user_id ON email_change_requests(user_id);
CREATE INDEX idx_email_change_status ON email_change_requests(status);
CREATE INDEX idx_email_change_expires_at ON email_change_requests(expires_at);
```

**Validation Rules**:
- `token`: 32文字、base64url形式、ユニーク
- `old_email`, `new_email`: 有効なメールアドレス形式
- `status`: 'pending' | 'completed' | 'cancelled'
- `expires_at`: created_at + 24時間

**State Transitions**:
```
pending → completed (新メールアドレスで確認リンククリック)
pending → cancelled (旧メールアドレスでキャンセルリンククリック、または有効期限切れ)
```

**Migration**: `0020_email_change_requests.sql`

---

### 5. email_delivery_logs (新規)

**Description**: メール送信履歴。デバッグ、監視、レート制限適用履歴。

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | ログID |
| user_id | INTEGER | NULL, FOREIGN KEY → users(id) | ユーザーID (存在しない場合NULL) |
| email_type | TEXT | NOT NULL | メールタイプ (password_reset/email_verification/email_change) |
| recipient_email | TEXT | NOT NULL | 送信先メールアドレス |
| status | TEXT | NOT NULL | ステータス (success/failed) |
| error_message | TEXT | NULL | エラーメッセージ (失敗時のみ) |
| retry_count | INTEGER | NOT NULL | リトライ回数 (0-3) |
| created_at | INTEGER | NOT NULL | 送信日時 (UNIX timestamp ms) |

**Indexes**:
```sql
CREATE INDEX idx_email_logs_user_id ON email_delivery_logs(user_id);
CREATE INDEX idx_email_logs_status ON email_delivery_logs(status);
CREATE INDEX idx_email_logs_created_at ON email_delivery_logs(created_at);
CREATE INDEX idx_email_logs_email_type ON email_delivery_logs(email_type);
```

**Validation Rules**:
- `email_type`: 'password_reset' | 'email_verification' | 'email_change'
- `status`: 'success' | 'failed'
- `retry_count`: 0～3

**Migration**: `0021_email_delivery_logs.sql`

---

### 6. email_rate_limits (新規)

**Description**: IPアドレス別メール送信レート制限。1時間あたり10回まで。

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| ip | TEXT | PRIMARY KEY | IPアドレス (IPv4/IPv6) |
| count | INTEGER | NOT NULL | 送信回数 |
| expires_at | INTEGER | NOT NULL | カウントリセット時刻 (UNIX timestamp ms) |

**Indexes**: PRIMARY KEY (ip) のみ

**Validation Rules**:
- `ip`: 有効なIPアドレス形式
- `count`: 0～10
- `expires_at`: 現在時刻 + 1時間

**Cleanup Strategy**:
- 期限切れレコード (`expires_at < now()`) は定期削除（Cron or 挿入時に古いレコード削除）

**Migration**: `0021_email_rate_limits.sql`

---

## Migrations Summary

| Migration File | Description | Tables Affected |
|---------------|-------------|-----------------|
| `0020_email_tokens.sql` | トークンテーブル作成 | password_reset_tokens, email_verification_tokens, email_change_requests |
| `0021_email_logs.sql` | ログ・レート制限テーブル作成 | email_delivery_logs, email_rate_limits |
| `0022_user_email_verified.sql` | ユーザーテーブル拡張 | users (email_verified列追加) |

---

## Data Lifecycle

### Token Lifecycle
1. **生成**: API呼び出し時、トークンテーブルに挿入
2. **検証**: トークンリンククリック時、`expires_at`と`used_at`チェック
3. **使用**: 成功時`used_at`更新、再利用防止
4. **削除**: 有効期限から7日経過後、定期削除（ストレージ最適化）

### Unverified Account Cleanup
1. **Cron実行**: 毎日02:00 UTC
2. **削除対象**: `email_verified = 0` かつ `created_at < now() - 7日`
3. **カスケード削除**: 関連トークン、ログも削除（FOREIGN KEY ON DELETE CASCADE）

### Rate Limit Reset
1. **自動リセット**: `expires_at < now()` のレコードを挿入時に削除
2. **カウント増加**: UPSERT でcount + 1
3. **制限チェック**: count >= 10 でエラー

---

## Security Considerations

- **Token Uniqueness**: UNIQUE制約でトークン衝突防止
- **Token Entropy**: 32文字/256bit、Web Crypto APIで生成
- **Token Expiration**: 有効期限厳守、期限切れトークンは拒否
- **Token Reuse Prevention**: `used_at`更新で再利用防止
- **Rate Limiting**: IPベース、10req/hour制限
- **Email Enumeration Prevention**: パスワードリセット時、存在しないメールアドレスでも成功メッセージ（実際は送信しない、ログに記録）

---

## Drizzle ORM Schema Example

```typescript
// packages/backend/src/db/schema/email.ts
import { sqliteTable, integer, text, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const passwordResetTokens = sqliteTable('password_reset_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: integer('expires_at').notNull(),
  usedAt: integer('used_at'),
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  tokenIdx: uniqueIndex('idx_password_reset_token').on(table.token),
  userIdIdx: index('idx_password_reset_user_id').on(table.userId),
  expiresAtIdx: index('idx_password_reset_expires_at').on(table.expiresAt),
}));

// ... 他のテーブルも同様
```
