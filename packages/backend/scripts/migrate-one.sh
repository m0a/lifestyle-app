#!/bin/bash
# Migrate one photo from old path to new path
# Usage: ./migrate-one.sh <photo_id> <meal_id> <old_path>

PHOTO_ID="$1"
MEAL_ID="$2"
OLD_PATH="$3"
USER_ID="cde38a67-a4a1-4079-a88f-bd4cc34dc2c4"
BUCKET="lifestyle-app-photos"

# Generate new photo ID (using date + random)
NEW_PHOTO_ID=$(date +%s)$(( RANDOM % 1000 ))
NEW_PATH="photos/${USER_ID}/${MEAL_ID}/${NEW_PHOTO_ID}.jpg"
TEMP_FILE="/tmp/migrate-${NEW_PHOTO_ID}.jpg"

echo "Migrating: $OLD_PATH -> $NEW_PATH"

# Download
if ! npx wrangler r2 object get "${BUCKET}/${OLD_PATH}" --file="$TEMP_FILE" 2>/dev/null; then
    echo "  SKIP: File not found in R2"
    exit 0
fi

# Upload to new path
if ! npx wrangler r2 object put "${BUCKET}/${NEW_PATH}" --file="$TEMP_FILE" --content-type="image/jpeg" 2>/dev/null; then
    echo "  ERROR: Upload failed"
    rm -f "$TEMP_FILE"
    exit 1
fi

# Update DB
npx wrangler d1 execute health-tracker-db --remote --command "UPDATE meal_photos SET photo_key = '${NEW_PATH}' WHERE id = '${PHOTO_ID}'" 2>/dev/null

# Delete old file
npx wrangler r2 object delete "${BUCKET}/${OLD_PATH}" 2>/dev/null

rm -f "$TEMP_FILE"
echo "  OK"
