#!/bin/bash
set -e

# Cloudflare Workers Free plan: 1MB limit after gzip compression
# Paid plan: 10MB limit (update MAX_SIZE_BYTES if upgraded)
MAX_SIZE_BYTES=1048576  # 1MB = 1024 * 1024
WARN_PERCENTAGE=80

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$BACKEND_DIR/../.." && pwd)"

echo "=== Cloudflare Workers Bundle Size Check ==="
echo ""

# Build shared package (backend depends on it)
echo "Building shared package..."
(cd "$REPO_ROOT" && pnpm --filter @lifestyle-app/shared build) > /dev/null 2>&1

# Generate bundle with wrangler dry-run
echo "Generating backend bundle..."
cd "$BACKEND_DIR"
pnpm exec wrangler deploy --dry-run --outdir dist 2>/dev/null

BUNDLE_FILE="$BACKEND_DIR/dist/index.js"

if [ ! -f "$BUNDLE_FILE" ]; then
  echo "❌ Bundle file not found: $BUNDLE_FILE"
  exit 1
fi

# Measure raw size (Linux: stat -c%s, macOS: stat -f%z)
RAW_SIZE=$(stat -c%s "$BUNDLE_FILE" 2>/dev/null || stat -f%z "$BUNDLE_FILE")
RAW_SIZE_KB=$((RAW_SIZE / 1024))

# Measure gzip size (what Cloudflare actually enforces)
GZIP_SIZE=$(gzip -c "$BUNDLE_FILE" | wc -c | tr -d ' ')
GZIP_SIZE_KB=$((GZIP_SIZE / 1024))
MAX_SIZE_KB=$((MAX_SIZE_BYTES / 1024))
PERCENTAGE=$((GZIP_SIZE * 100 / MAX_SIZE_BYTES))

echo ""
echo "📦 Bundle size results:"
echo "   Raw:  ${RAW_SIZE_KB}KB"
echo "   Gzip: ${GZIP_SIZE_KB}KB / ${MAX_SIZE_KB}KB (${PERCENTAGE}%)"
echo ""

# Write JSON report for CI
REPORT_FILE="$REPO_ROOT/bundle-size-report.json"
cat > "$REPORT_FILE" <<REPORT_EOF
{
  "raw_bytes": ${RAW_SIZE},
  "raw_kb": ${RAW_SIZE_KB},
  "gzip_bytes": ${GZIP_SIZE},
  "gzip_kb": ${GZIP_SIZE_KB},
  "max_bytes": ${MAX_SIZE_BYTES},
  "max_kb": ${MAX_SIZE_KB},
  "percentage": ${PERCENTAGE}
}
REPORT_EOF

# Clean up dist
rm -rf "$BACKEND_DIR/dist"

# Check against limit
if [ "$GZIP_SIZE" -gt "$MAX_SIZE_BYTES" ]; then
  echo "❌ FAILED: Gzip bundle size (${GZIP_SIZE_KB}KB) exceeds 1MB limit!"
  echo "   Exceeded by: $((GZIP_SIZE_KB - MAX_SIZE_KB))KB"
  exit 1
fi

# Warn if approaching limit
WARN_THRESHOLD=$((MAX_SIZE_BYTES * WARN_PERCENTAGE / 100))
if [ "$GZIP_SIZE" -gt "$WARN_THRESHOLD" ]; then
  echo "⚠️  Warning: Bundle size is over ${WARN_PERCENTAGE}% of the 1MB limit"
fi

echo "✅ Bundle size check passed"
