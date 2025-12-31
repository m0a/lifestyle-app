# Checklist: Specification Quality Review

**Purpose**: 仕様書（spec.md/plan.md）の品質をセルフレビューするための要件品質チェックリスト
**Created**: 2024-12-31
**Feature**: 001-health-tracker
**Focus**: 全体的な仕様品質
**Depth**: 標準（20-30項目）
**Actor**: 仕様作成者

---

## Requirement Completeness（要件の完全性）

- [ ] CHK001 - 全てのユーザーストーリーに受け入れ基準（Acceptance Scenarios）が定義されているか？ [Completeness, Spec §US1-4]
- [ ] CHK002 - 認証失敗時のエラーハンドリング要件が明記されているか？ [Gap, Spec §FR-001]
- [ ] CHK003 - データ入力のバリデーション要件（最小値/最大値/形式）が全フィールドに対して定義されているか？ [Completeness, Spec §FR-002,003,005]
- [ ] CHK004 - オフライン→オンライン復帰時の同期競合解決ルールが定義されているか？ [Gap, Spec §FR-010]
- [ ] CHK005 - セッション管理要件（タイムアウト、自動ログアウト等）が明記されているか？ [Gap]

## Requirement Clarity（要件の明確性）

- [ ] CHK006 - 「3タップ以内」の定義に画面遷移やモーダル表示が含まれるか明確か？ [Clarity, Spec §SC-001]
- [ ] CHK007 - 「週間レポート」の表示対象期間（今週/過去7日間等）が明確に定義されているか？ [Ambiguity, Spec §US2,US3]
- [ ] CHK008 - 「励ましのメッセージ」の具体的な文言・表示タイミングが定義されているか？ [Ambiguity, Spec §Edge Cases]
- [ ] CHK009 - 「1000同時接続」の定義（リクエスト数/秒、アクティブセッション数等）が明確か？ [Clarity, Spec §SC-006]
- [ ] CHK010 - 食事タイプ（朝/昼/夜/間食）の時間帯定義が明記されているか？ [Gap, Spec §MealRecord]

## Requirement Consistency（要件の一貫性）

- [ ] CHK011 - spec.mdのエンティティ定義とdata-model.mdのスキーマが一致しているか？ [Consistency]
- [ ] CHK012 - ユーザーストーリーの優先度（P1-P4）とタスクのフェーズ順序が整合しているか？ [Consistency, Spec §US1-4, Tasks §Phase3-6]
- [ ] CHK013 - Constitution原則とspec.md/plan.mdの要件が矛盾なく整合しているか？ [Consistency]
- [ ] CHK014 - 複数箇所で参照される用語（例: 「記録日時」vs「recordedAt」）が統一されているか？ [Consistency]

## Acceptance Criteria Quality（受け入れ基準の品質）

- [ ] CHK015 - SC-004「70%以上のユーザーが1週間継続」の測定方法が具体的に定義されているか？ [Measurability, Spec §SC-004]
- [ ] CHK016 - 全ての受け入れシナリオがGiven-When-Then形式で客観的に検証可能か？ [Measurability, Spec §US1-4]
- [ ] CHK017 - パフォーマンス要件（200ms以下、2秒以内等）の測定条件（ネットワーク、デバイス）が定義されているか？ [Measurability, Spec §Plan]

## Scenario Coverage（シナリオカバレッジ）

- [ ] CHK018 - 同一日に複数回の体重記録がある場合の表示・編集ルールが定義されているか？ [Coverage, Spec §Edge Cases]
- [ ] CHK019 - ユーザーが記録を削除した後のダッシュボード表示要件が定義されているか？ [Gap]
- [ ] CHK020 - 食事記録の「カロリーなし」状態での集計・表示要件が明確か？ [Coverage, Spec §Edge Cases]
- [ ] CHK021 - 運動種目の自由入力における重複・類似名（ウォーキング/歩行）の扱いが定義されているか？ [Gap]

## Edge Case Coverage（エッジケースカバレッジ）

- [ ] CHK022 - 体重の極端値（20kg未満、300kg超）入力時の要件が定義されているか？ [Edge Case, Spec §FR-002]
- [ ] CHK023 - 未来日付での記録入力が許可されるか否かが明記されているか？ [Gap]
- [ ] CHK024 - 長文の食事内容入力（1000文字超等）に対する制限・表示要件が定義されているか？ [Gap, Spec §FR-003]
- [ ] CHK025 - ダッシュボード期間内にデータが0件の場合の表示要件が定義されているか？ [Edge Case]

## Non-Functional Requirements（非機能要件）

- [ ] CHK026 - パスワードの強度要件（文字数、複雑性等）が明記されているか？ [Gap, Spec §FR-001]
- [ ] CHK027 - データエクスポートの形式（JSON/CSV等）と内容が具体的に定義されているか？ [Clarity, Spec §FR-008]
- [ ] CHK028 - アカウント削除時の「完全削除」の範囲（バックアップ含む等）が明確か？ [Clarity, Spec §FR-009]
- [ ] CHK029 - 負荷テスト・パフォーマンステストの実施要件がタスクに含まれているか？ [Gap, Tasks]

## Dependencies & Assumptions（依存関係と前提条件）

- [ ] CHK030 - 「将来機能」として記載された項目（lbs対応、カロリー自動計算等）のスコープ外が明確か？ [Assumption, Spec §Assumptions]
- [ ] CHK031 - Cloudflare D1の制約（ストレージ上限、クエリ制限等）が考慮されているか？ [Dependency, Plan]

---

## Summary

| Category | Items |
|----------|-------|
| Requirement Completeness | 5 |
| Requirement Clarity | 5 |
| Requirement Consistency | 4 |
| Acceptance Criteria Quality | 3 |
| Scenario Coverage | 4 |
| Edge Case Coverage | 4 |
| Non-Functional Requirements | 4 |
| Dependencies & Assumptions | 2 |
| **Total** | **31** |
