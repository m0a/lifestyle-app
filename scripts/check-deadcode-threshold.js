#!/usr/bin/env node
import { readFileSync } from 'fs';

// Roadmap: 40 → 30 → 20 → 10 → 0 (reduce by 10 every 2 weeks)
// Week 2: Reduced from 40 to 30
const MAX_UNUSED_EXPORTS = 30;

try {
  const report = JSON.parse(readFileSync('knip-report.json', 'utf8'));

  let unusedExportsCount = 0;

  // Knip JSON reporter format: { files: [...], issues: [...] }
  if (report.issues && Array.isArray(report.issues)) {
    for (const issue of report.issues) {
      if (issue.exports && Array.isArray(issue.exports)) {
        unusedExportsCount += issue.exports.length;
      }
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
