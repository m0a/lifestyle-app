# Research: デッドコード検出ツール選定

**Date**: 2026-01-09
**Researcher**: Plan generation phase
**Objective**: pnpm monorepo向けのデッドコード検出ツールの選定とCI統合方法の調査

## Executive Summary

当初ts-pruneを計画していたが、リサーチの結果、**Knipへの変更を推奨**する。ts-pruneはメンテナンスモードに入っており、開発者自身がKnipを推奨している。Knipはモノレポのネイティブサポート、包括的な検出機能、活発な開発を提供し、本プロジェクトの要件により適している。

## Decision: Knip採用

### 選択理由
1. **公式推奨**: ts-prune開発者がKnipを推奨
2. **アクティブ開発**: 定期的なアップデートとバグ修正
3. **モノレポファースト**: pnpm workspacesのネイティブサポート
4. **包括的検出**: 未使用エクスポート + ファイル + 依存関係
5. **CI統合**: ビルトインレポーター、閾値チェック機能

### 仕様書の更新が必要
- ✅ 仕様書では「ts-prune」と明記されている
- ✅ リサーチ結果に基づき、実装では**Knip**を使用する
- ✅ 機能要件は変わらない（デッドコード検出、CI統合、閾値ベースのブロック）

## Tool Comparison

| Feature | ts-prune | **Knip** (選択) | eslint-plugin-unused-imports |
|---------|----------|-----------------|------------------------------|
| **Status** | ⚠️ Maintenance mode | ✅ Actively developed | ✅ Active |
| **Unused exports** | ✅ Yes | ✅ Yes | ✅ Yes (single file) |
| **Unused files** | ❌ No | ✅ Yes | ❌ No |
| **Unused dependencies** | ❌ No | ✅ Yes | ❌ No |
| **Monorepo support** | ⚠️ Basic | ✅ Native | ✅ Yes |
| **Configuration** | Minimal | Extensive | ESLint config |
| **CI integration** | Manual scripting | Built-in | ESLint output |
| **Threshold support** | Manual (count lines) | Built-in filters | N/A |

**Winner**: Knip - 包括的、アクティブ、モノレポ最適化

## Knip Configuration for Monorepo

### Installation
```bash
pnpm add -D knip
```

### Configuration: `knip.json`

```json
{
  "$schema": "https://unpkg.com/knip@latest/schema.json",
  "workspaces": {
    ".": {
      "entry": ["tests/**/*.test.ts", "tests/**/*.spec.ts"],
      "project": ["tests/**/*.ts"],
      "ignore": ["**/*.d.ts", "**/dist/**", "**/node_modules/**"]
    },
    "packages/shared": {
      "entry": ["src/index.ts"],
      "project": ["src/**/*.ts"]
    },
    "packages/backend": {
      "entry": ["src/index.ts", "src/routes/**/*.ts", "migrations/**/*.sql"],
      "project": ["src/**/*.ts"],
      "ignore": ["src/**/*.test.ts"]
    },
    "packages/frontend": {
      "entry": ["src/main.tsx", "src/App.tsx", "index.html"],
      "project": ["src/**/*.{ts,tsx}"],
      "ignore": ["src/**/*.test.tsx", "src/vite-env.d.ts"]
    }
  },
  "ignore": [
    "**/*.test.ts",
    "**/*.test.tsx",
    "**/*.spec.ts",
    "**/vite.config.ts",
    "**/vitest.config.ts",
    "**/playwright.config.ts"
  ],
  "ignoreDependencies": [
    "@types/*",
    "typescript",
    "vite",
    "vitest",
    "@playwright/test"
  ]
}
```

### Rationale
- **Workspace-specific configuration**: 各パッケージの特性に合わせたエントリーポイント設定
- **Ignore patterns**: テストファイル、ビルドツール設定を除外（誤検出防止）
- **ignoreDependencies**: 型定義、開発ツールを除外

## CI Integration with Threshold

### Threshold Checking Script: `scripts/check-deadcode-threshold.js`

```javascript
#!/usr/bin/env node
import { readFileSync } from 'fs';

const MAX_UNUSED_EXPORTS = 10; // 初期閾値

try {
  const report = JSON.parse(readFileSync('knip-report.json', 'utf8'));

  let unusedExportsCount = 0;

  for (const [workspace, issues] of Object.entries(report)) {
    if (issues.exports) {
      unusedExportsCount += issues.exports.length;
    }
  }

  console.log(`Found ${unusedExportsCount} unused exports (threshold: ${MAX_UNUSED_EXPORTS})`);

  if (unusedExportsCount > MAX_UNUSED_EXPORTS) {
    console.error(`❌ FAILED: Unused exports (${unusedExportsCount}) exceed threshold (${MAX_UNUSED_EXPORTS})`);
    console.error(`Please remove unused exports or adjust the threshold.`);
    process.exit(1);
  }

  console.log(`✅ PASSED: Unused exports within threshold`);
  process.exit(0);
} catch (error) {
  console.error('Error reading knip report:', error);
  process.exit(1);
}
```

### Rationale
- **JSON output**: Knipの構造化出力を利用
- **Configurable threshold**: 定数で簡単に変更可能
- **Clear feedback**: 閾値超過時に詳細なエラーメッセージ
- **Exit codes**: CI統合に必要な0/1の終了コード

### Package.json Scripts

```json
{
  "scripts": {
    "find-deadcode": "knip",
    "find-deadcode:fix": "knip --fix",
    "find-deadcode:ci": "knip --reporter json > knip-report.json && node scripts/check-deadcode-threshold.js"
  }
}
```

## GitHub Actions CI Job

```yaml
deadcode-check:
  name: Dead Code Analysis
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    - name: Setup pnpm
      uses: pnpm/action-setup@v2
      with:
        version: 8

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'pnpm'

    - name: Install dependencies
      run: pnpm install --frozen-lockfile

    - name: Build shared package
      run: pnpm --filter @lifestyle-app/shared build

    - name: Run Knip with threshold check
      run: pnpm find-deadcode:ci

    - name: Comment PR with results
      if: always() && github.event_name == 'pull_request'
      uses: actions/github-script@v7
      with:
        script: |
          const fs = require('fs');
          const report = JSON.parse(fs.readFileSync('knip-report.json', 'utf8'));
          let count = 0;
          for (const [workspace, issues] of Object.entries(report)) {
            if (issues.exports) count += issues.exports.length;
          }
          await github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: `## 🔍 Dead Code Analysis\n\n**Unused Exports**: ${count} (Threshold: 10)\n\n${count > 10 ? '❌ **FAILED**: Exceeds threshold' : '✅ **PASSED**: Within threshold'}`
          });

    - name: Upload Knip report
      if: always()
      uses: actions/upload-artifact@v4
      with:
        name: knip-report
        path: knip-report.json
        retention-days: 30
```

### Rationale
- **PR comment**: 開発者への即時フィードバック（明確化Q1で決定）
- **Artifact upload**: CIログに結果を記録（明確化Q1で決定）
- **Fail on threshold**: 閾値超過でCIを失敗させる（明確化Q4で決定）

## Common False Positives and Exclusions

| Pattern | Reason | Solution |
|---------|--------|----------|
| `src/index.ts` exports | Public API | Set as `entry` in config |
| Type definitions (`.d.ts`) | Type-only files | Add to `ignore` |
| Test utilities | Used by test files | Mark tests as `entry` |
| Hono route handlers | Framework auto-import | Add routes as `entry` |
| Migration files | Runtime imports | Add to `entry` |

### Exclusion Strategy
1. **Start permissive**: 多めに除外して誤検出を防ぐ
2. **Monitor results**: 実際の検出結果を確認
3. **Refine gradually**: 除外パターンを段階的に厳密化
4. **Document decisions**: 除外理由をコメントで記録

## Implementation Roadmap

### Phase 1: Setup (Day 1)
1. Install Knip: `pnpm add -D knip`
2. Create `knip.json` configuration
3. Run baseline: `pnpm find-deadcode`
4. Document current unused export count

### Phase 2: CI Integration (Day 1-2)
1. Create `scripts/check-deadcode-threshold.js`
2. Add scripts to package.json
3. Add CI job to `.github/workflows/ci.yml`
4. Test on this PR

### Phase 3: Gradual Cleanup (Ongoing)
1. Review false positives → Update config
2. Remove legitimate unused exports
3. Lower threshold by 5 every 2 weeks
4. Target: 0 unused exports in 2-3 months

### Phase 4: Maintenance (After reaching zero)
1. Set threshold to 0
2. Enforce strict mode
3. Monitor new PRs
4. Quarterly config review

## Alternatives Considered

### ts-prune
**Pros**: Simple, fast, minimal configuration
**Cons**: Maintenance mode, limited monorepo support, manual CI scripting
**Verdict**: ❌ Rejected due to maintenance mode

### eslint-plugin-unused-imports
**Pros**: ESLint integration, commit-time checking
**Cons**: Single-file scope, no cross-file analysis, no unused files detection
**Verdict**: ❌ Too limited for our needs

### knip
**Pros**: Comprehensive, active, monorepo-first, CI-friendly
**Cons**: More configuration needed
**Verdict**: ✅ **Selected**

## References

1. [ts-prune GitHub](https://github.com/nadeesha/ts-prune) - Official recommendation to use Knip
2. [Knip Documentation](https://knip.dev/)
3. [Knip Monorepo Guide](https://knip.dev/features/monorepos-and-workspaces)
4. [Dead Code Detection: Why We Chose Knip Over ts-prune](https://levelup.gitconnected.com/dead-code-detection-in-typescript-projects-why-we-chose-knip-over-ts-prune-8feea827da35)
5. [Using Knip in CI](https://knip.dev/guides/using-knip-in-ci)

## Conclusion

**Decision**: Knipを採用する

**Impact on Spec**: 仕様書の「ts-prune」への言及は、実装時に「Knip」で読み替える。機能要件（デッドコード検出、CI統合、閾値ベースブロック）は変わらない。

**Next Steps**: Phase 1（data-model.md, quickstart.md作成）に進む。
