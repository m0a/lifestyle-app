#!/bin/bash
# Photo path migration script
# Migrates legacy photo paths to the standardized format: photos/{userId}/{mealId}/{photoId}.jpg

set -e

BUCKET_NAME="lifestyle-app-photos"
USER_ID="cde38a67-a4a1-4079-a88f-bd4cc34dc2c4"

# Create temp directory for file transfers
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

echo "Starting photo path migration..."
echo "Temp directory: $TEMP_DIR"

# Counter for progress
TOTAL=0
SUCCESS=0
FAILED=0

migrate_photo() {
    local photo_id="$1"
    local meal_id="$2"
    local old_path="$3"

    # Generate new path
    local new_path="photos/${USER_ID}/${meal_id}/${photo_id}.jpg"

    echo ""
    echo "[$((TOTAL+1))] Migrating: $old_path -> $new_path"

    # Download file from old path
    local temp_file="${TEMP_DIR}/${photo_id}.jpg"
    if ! npx wrangler r2 object get "${BUCKET_NAME}/${old_path}" --file="$temp_file" 2>/dev/null; then
        echo "  ERROR: Failed to download from $old_path"
        ((FAILED++))
        return 1
    fi

    # Upload to new path
    if ! npx wrangler r2 object put "${BUCKET_NAME}/${new_path}" --file="$temp_file" --content-type="image/jpeg" 2>/dev/null; then
        echo "  ERROR: Failed to upload to $new_path"
        ((FAILED++))
        return 1
    fi

    # Update database
    if ! npx wrangler d1 execute health-tracker-db --remote --command "UPDATE meal_photos SET photo_key = '${new_path}' WHERE id = '${photo_id}'" 2>/dev/null; then
        echo "  ERROR: Failed to update database for $photo_id"
        ((FAILED++))
        return 1
    fi

    # Delete old file
    if ! npx wrangler r2 object delete "${BUCKET_NAME}/${old_path}" 2>/dev/null; then
        echo "  WARNING: Failed to delete old file $old_path (continuing)"
    fi

    # Cleanup temp file
    rm -f "$temp_file"

    echo "  SUCCESS"
    ((SUCCESS++))
    return 0
}

# meals/{mealId}/photo.jpg format (60 records)
echo ""
echo "=== Migrating meals/ format photos ==="

meals_photos=(
    "legacy-23c24769-37b7-4589-9eda-dd8602f88235|23c24769-37b7-4589-9eda-dd8602f88235|meals/23c24769-37b7-4589-9eda-dd8602f88235/photo.jpg"
    "legacy-b0c3c260-5070-4579-9992-704357c5c5ee|b0c3c260-5070-4579-9992-704357c5c5ee|meals/b0c3c260-5070-4579-9992-704357c5c5ee/photo.jpg"
    "legacy-551e526c-79ad-4308-b02b-fa38c930fe68|551e526c-79ad-4308-b02b-fa38c930fe68|meals/551e526c-79ad-4308-b02b-fa38c930fe68/photo.jpg"
    "legacy-e0a9baaf-333f-42b7-941b-763c702df3d5|e0a9baaf-333f-42b7-941b-763c702df3d5|meals/e0a9baaf-333f-42b7-941b-763c702df3d5/photo.jpg"
    "legacy-8ed00a99-dda1-462e-9b08-4616704e83e7|8ed00a99-dda1-462e-9b08-4616704e83e7|meals/8ed00a99-dda1-462e-9b08-4616704e83e7/photo.jpg"
    "legacy-4d752998-f17a-40c0-ace5-817b7769e133|4d752998-f17a-40c0-ace5-817b7769e133|meals/4d752998-f17a-40c0-ace5-817b7769e133/photo.jpg"
    "legacy-f936a438-3574-4eac-b64b-3f91c80fc4f6|f936a438-3574-4eac-b64b-3f91c80fc4f6|meals/f936a438-3574-4eac-b64b-3f91c80fc4f6/photo.jpg"
    "legacy-c3c91eca-14e3-42bf-9aec-c17e4141d5f8|c3c91eca-14e3-42bf-9aec-c17e4141d5f8|meals/c3c91eca-14e3-42bf-9aec-c17e4141d5f8/photo.jpg"
    "legacy-9d654e5c-bc94-444c-89b8-ef1e2dd5029b|9d654e5c-bc94-444c-89b8-ef1e2dd5029b|meals/9d654e5c-bc94-444c-89b8-ef1e2dd5029b/photo.jpg"
    "legacy-a7d2d463-d4da-437b-a37c-002420756665|a7d2d463-d4da-437b-a37c-002420756665|meals/a7d2d463-d4da-437b-a37c-002420756665/photo.jpg"
    "legacy-cc8675e4-f314-4253-ab83-ed6cbd4d1498|cc8675e4-f314-4253-ab83-ed6cbd4d1498|meals/cc8675e4-f314-4253-ab83-ed6cbd4d1498/photo.jpg"
    "legacy-7a926d26-8eae-4ca0-99a7-3af9ba39ba47|7a926d26-8eae-4ca0-99a7-3af9ba39ba47|meals/7a926d26-8eae-4ca0-99a7-3af9ba39ba47/photo.jpg"
    "legacy-69a71ad7-a4a4-4dc3-ab48-298023c16a08|69a71ad7-a4a4-4dc3-ab48-298023c16a08|meals/69a71ad7-a4a4-4dc3-ab48-298023c16a08/photo.jpg"
    "legacy-ae3cffc1-67ee-43bf-8c86-38857308b35d|ae3cffc1-67ee-43bf-8c86-38857308b35d|meals/ae3cffc1-67ee-43bf-8c86-38857308b35d/photo.jpg"
    "legacy-a62519d3-c5b2-4f09-99e5-224688cd4de1|a62519d3-c5b2-4f09-99e5-224688cd4de1|meals/a62519d3-c5b2-4f09-99e5-224688cd4de1/photo.jpg"
    "legacy-eb429871-4675-4c58-9d5d-57a0c2771cdd|eb429871-4675-4c58-9d5d-57a0c2771cdd|meals/eb429871-4675-4c58-9d5d-57a0c2771cdd/photo.jpg"
    "legacy-51190c74-a3f9-444e-aa1a-cc53e78c8e04|51190c74-a3f9-444e-aa1a-cc53e78c8e04|meals/51190c74-a3f9-444e-aa1a-cc53e78c8e04/photo.jpg"
    "legacy-463e3995-74dc-4e57-8578-dfd14d6c5e02|463e3995-74dc-4e57-8578-dfd14d6c5e02|meals/463e3995-74dc-4e57-8578-dfd14d6c5e02/photo.jpg"
    "legacy-3c062a5b-c2db-429f-b308-4874fe8dcb29|3c062a5b-c2db-429f-b308-4874fe8dcb29|meals/3c062a5b-c2db-429f-b308-4874fe8dcb29/photo.jpg"
    "legacy-a922c770-a17f-4d2c-ac6c-6d35893ca391|a922c770-a17f-4d2c-ac6c-6d35893ca391|meals/a922c770-a17f-4d2c-ac6c-6d35893ca391/photo.jpg"
    "legacy-b768e55f-8982-441f-a216-ba0dfcbefc74|b768e55f-8982-441f-a216-ba0dfcbefc74|meals/b768e55f-8982-441f-a216-ba0dfcbefc74/photo.jpg"
    "legacy-296d0baa-c6a6-442c-b8d7-215d7dc7fb30|296d0baa-c6a6-442c-b8d7-215d7dc7fb30|meals/296d0baa-c6a6-442c-b8d7-215d7dc7fb30/photo.jpg"
    "legacy-1cc22271-0195-409b-9c05-96db042ff1d0|1cc22271-0195-409b-9c05-96db042ff1d0|meals/1cc22271-0195-409b-9c05-96db042ff1d0/photo.jpg"
    "legacy-6fc45f04-4e2c-47e9-b41c-ea52783ed770|6fc45f04-4e2c-47e9-b41c-ea52783ed770|meals/6fc45f04-4e2c-47e9-b41c-ea52783ed770/photo.jpg"
    "legacy-3e3658c7-94e8-4780-a872-f2f3b603986a|3e3658c7-94e8-4780-a872-f2f3b603986a|meals/3e3658c7-94e8-4780-a872-f2f3b603986a/photo.jpg"
    "legacy-1ffd07ec-5bec-4a87-bbca-489cfa80373b|1ffd07ec-5bec-4a87-bbca-489cfa80373b|meals/1ffd07ec-5bec-4a87-bbca-489cfa80373b/photo.jpg"
    "legacy-19a139cb-2c1f-49f6-955e-b102343b4a18|19a139cb-2c1f-49f6-955e-b102343b4a18|meals/19a139cb-2c1f-49f6-955e-b102343b4a18/photo.jpg"
    "legacy-37c19efd-2819-4de8-8807-6c9165e1b517|37c19efd-2819-4de8-8807-6c9165e1b517|meals/37c19efd-2819-4de8-8807-6c9165e1b517/photo.jpg"
    "legacy-71f417c9-4e76-4e5f-a0bf-74b2fdcc3f5f|71f417c9-4e76-4e5f-a0bf-74b2fdcc3f5f|meals/71f417c9-4e76-4e5f-a0bf-74b2fdcc3f5f/photo.jpg"
    "legacy-3742349f-a42e-4f6a-8e6f-234271d9401d|3742349f-a42e-4f6a-8e6f-234271d9401d|meals/3742349f-a42e-4f6a-8e6f-234271d9401d/photo.jpg"
    "legacy-2b75ef83-d031-4848-95a7-74a5359e7d7d|2b75ef83-d031-4848-95a7-74a5359e7d7d|meals/2b75ef83-d031-4848-95a7-74a5359e7d7d/photo.jpg"
    "legacy-62fdc8ab-9d96-477a-a828-56a4886d525b|62fdc8ab-9d96-477a-a828-56a4886d525b|meals/62fdc8ab-9d96-477a-a828-56a4886d525b/photo.jpg"
    "legacy-daef9099-1fdf-4189-8bd8-9c8b7a21fd0d|daef9099-1fdf-4189-8bd8-9c8b7a21fd0d|meals/daef9099-1fdf-4189-8bd8-9c8b7a21fd0d/photo.jpg"
    "legacy-f45e32f5-825f-4624-b7e2-4c9d0e82af2a|f45e32f5-825f-4624-b7e2-4c9d0e82af2a|meals/f45e32f5-825f-4624-b7e2-4c9d0e82af2a/photo.jpg"
    "legacy-168367ba-e2a7-4698-a696-470195a78469|168367ba-e2a7-4698-a696-470195a78469|meals/168367ba-e2a7-4698-a696-470195a78469/photo.jpg"
    "legacy-f3899c7b-5a6b-44e8-93e9-bf7b7fb1859a|f3899c7b-5a6b-44e8-93e9-bf7b7fb1859a|meals/f3899c7b-5a6b-44e8-93e9-bf7b7fb1859a/photo.jpg"
    "legacy-4644ef4e-76d7-435e-ad7d-bba80326ae48|4644ef4e-76d7-435e-ad7d-bba80326ae48|meals/4644ef4e-76d7-435e-ad7d-bba80326ae48/photo.jpg"
    "legacy-2c3b2636-324a-4a5b-96af-0aa2d9ae12e4|2c3b2636-324a-4a5b-96af-0aa2d9ae12e4|meals/2c3b2636-324a-4a5b-96af-0aa2d9ae12e4/photo.jpg"
    "legacy-3002fa4e-3025-468b-a061-034fa03f7097|3002fa4e-3025-468b-a061-034fa03f7097|meals/3002fa4e-3025-468b-a061-034fa03f7097/photo.jpg"
    "legacy-dc8d6f7b-677c-40db-be5d-784401f6ba95|dc8d6f7b-677c-40db-be5d-784401f6ba95|meals/dc8d6f7b-677c-40db-be5d-784401f6ba95/photo.jpg"
    "legacy-3bc43c2b-7c80-4f6c-bd23-b311f852c52c|3bc43c2b-7c80-4f6c-bd23-b311f852c52c|meals/3bc43c2b-7c80-4f6c-bd23-b311f852c52c/photo.jpg"
    "legacy-4cfe5063-4eb0-4c45-9c0d-903a7b1a768f|4cfe5063-4eb0-4c45-9c0d-903a7b1a768f|meals/4cfe5063-4eb0-4c45-9c0d-903a7b1a768f/photo.jpg"
    "legacy-51752af4-9bda-41b0-9416-5599262d116c|51752af4-9bda-41b0-9416-5599262d116c|meals/51752af4-9bda-41b0-9416-5599262d116c/photo.jpg"
    "legacy-41a2607a-3ed0-4818-8dbe-e03e03a49052|41a2607a-3ed0-4818-8dbe-e03e03a49052|meals/41a2607a-3ed0-4818-8dbe-e03e03a49052/photo.jpg"
    "legacy-fbab4a1a-3a15-4d6a-b288-f7866e638b80|fbab4a1a-3a15-4d6a-b288-f7866e638b80|meals/fbab4a1a-3a15-4d6a-b288-f7866e638b80/photo.jpg"
    "legacy-c6b27732-94e6-42a9-9591-4ab643c353ef|c6b27732-94e6-42a9-9591-4ab643c353ef|meals/c6b27732-94e6-42a9-9591-4ab643c353ef/photo.jpg"
    "legacy-28fdf141-4f2a-4e5a-84b2-bdb149a2bc33|28fdf141-4f2a-4e5a-84b2-bdb149a2bc33|meals/28fdf141-4f2a-4e5a-84b2-bdb149a2bc33/photo.jpg"
    "legacy-0ba24709-be09-4488-b691-bbb859d80611|0ba24709-be09-4488-b691-bbb859d80611|meals/0ba24709-be09-4488-b691-bbb859d80611/photo.jpg"
    "legacy-3dc375f6-c2ac-4a37-963f-099e52bf4b7b|3dc375f6-c2ac-4a37-963f-099e52bf4b7b|meals/3dc375f6-c2ac-4a37-963f-099e52bf4b7b/photo.jpg"
    "legacy-1b95196e-41b4-41e7-88a5-f36eb5ed4214|1b95196e-41b4-41e7-88a5-f36eb5ed4214|meals/1b95196e-41b4-41e7-88a5-f36eb5ed4214/photo.jpg"
    "legacy-36360b87-e069-4db3-8ea8-35d02788db95|36360b87-e069-4db3-8ea8-35d02788db95|meals/36360b87-e069-4db3-8ea8-35d02788db95/photo.jpg"
    "legacy-41979c58-f23b-4f7d-be77-ea7370c73ecd|41979c58-f23b-4f7d-be77-ea7370c73ecd|meals/41979c58-f23b-4f7d-be77-ea7370c73ecd/photo.jpg"
    "legacy-0627e592-7763-4eee-9259-be36887a4abe|0627e592-7763-4eee-9259-be36887a4abe|meals/0627e592-7763-4eee-9259-be36887a4abe/photo.jpg"
    "legacy-da12c1ec-58bb-4a72-81b4-9d6c601df805|da12c1ec-58bb-4a72-81b4-9d6c601df805|meals/da12c1ec-58bb-4a72-81b4-9d6c601df805/photo.jpg"
    "legacy-63bba932-181e-4ba9-8e21-83536d74630b|63bba932-181e-4ba9-8e21-83536d74630b|meals/63bba932-181e-4ba9-8e21-83536d74630b/photo.jpg"
    "legacy-8d8d6ede-fdec-4d23-b6ff-f895752e9811|8d8d6ede-fdec-4d23-b6ff-f895752e9811|meals/8d8d6ede-fdec-4d23-b6ff-f895752e9811/photo.jpg"
    "Wb9Q_RQes6oCleFR7ByHG|4219c3f1-7690-4f75-8094-403b2b22cd64|meals/4219c3f1-7690-4f75-8094-403b2b22cd64/photo.jpg"
    "0Qg3gS8erVIxwwYaSu4EE|1b434bde-bae6-4377-8aa8-1278893198a9|meals/1b434bde-bae6-4377-8aa8-1278893198a9/photo.jpg"
    "ncsy9RncLK47-1ogCJpGF|9016087e-29ad-4cdc-86c8-02b5555c54ec|meals/9016087e-29ad-4cdc-86c8-02b5555c54ec/photo.jpg"
    "mld0GE0SqgbONwGiIaF1y|c5b883fa-e95b-4e22-9ed3-393d5ba28bdd|meals/c5b883fa-e95b-4e22-9ed3-393d5ba28bdd/photo.jpg"
)

# temp/{uuid} format (8 records)
temp_photos=(
    "legacy-17b58ca7-62a7-4ee6-8d87-33cd950edfb5|17b58ca7-62a7-4ee6-8d87-33cd950edfb5|temp/2ab957c4-abdf-441c-aaef-d661fc6487fb"
    "legacy-d40592b4-6521-4001-8e35-549e68feb37b|d40592b4-6521-4001-8e35-549e68feb37b|temp/92e73d64-8ade-4e30-8f6b-e089712e4185"
    "legacy-8b6fe189-1521-4b7a-a969-03a8a2c9c7cc|8b6fe189-1521-4b7a-a969-03a8a2c9c7cc|temp/85640dec-fc03-428e-9dfe-5aede1844226"
    "legacy-7ae0ae80-d47e-47c0-a249-36449aa737fa|7ae0ae80-d47e-47c0-a249-36449aa737fa|temp/fa8cd15e-ef19-415b-ab6c-8bf4f5f53346"
    "legacy-0e542598-ae20-443e-90db-d38e4724e56a|0e542598-ae20-443e-90db-d38e4724e56a|temp/19eb86c9-fa2c-4fe4-a708-ab125a2d24f4"
    "legacy-6c27a5e6-a016-4998-84bc-d96574021de0|6c27a5e6-a016-4998-84bc-d96574021de0|temp/98a1b934-fa8a-4e2c-9bdf-59a7da8354bb"
    "legacy-4f24b8de-8f08-4e7f-9654-15952a0bd419|4f24b8de-8f08-4e7f-9654-15952a0bd419|temp/f532a54c-b3cd-41a7-8c63-605ca817cc53"
    "legacy-f2e191a9-7ac9-4232-a9e9-4997ae39e768|f2e191a9-7ac9-4232-a9e9-4997ae39e768|temp/9534ac98-a34f-46bf-86c1-1b53ab2530ac"
)

# Process meals/ format
for entry in "${meals_photos[@]}"; do
    IFS='|' read -r photo_id meal_id old_path <<< "$entry"
    ((TOTAL++))
    migrate_photo "$photo_id" "$meal_id" "$old_path" || true
done

echo ""
echo "=== Migrating temp/ format photos ==="

# Process temp/ format
for entry in "${temp_photos[@]}"; do
    IFS='|' read -r photo_id meal_id old_path <<< "$entry"
    ((TOTAL++))
    migrate_photo "$photo_id" "$meal_id" "$old_path" || true
done

echo ""
echo "==================================="
echo "Migration complete!"
echo "Total: $TOTAL"
echo "Success: $SUCCESS"
echo "Failed: $FAILED"
echo "==================================="
