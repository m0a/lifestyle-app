# Test Fixtures

This directory contains test assets used in E2E and integration tests.

## Required Test Images

For E2E tests to run successfully, the following test images are required:

### Meal Photos
- `meal-photo-1.jpg` - Test meal photo #1 (e.g., rice bowl)
- `meal-photo-2.jpg` - Test meal photo #2 (e.g., salad)
- `meal-photo-3.jpg` - Test meal photo #3 (e.g., soup)
- `not-food.jpg` - Non-food image for error testing (e.g., landscape)

### Requirements
- Format: JPEG or PNG
- Size: Any size (will be resized by application)
- Content: Food images for positive tests, non-food for negative tests

### Creating Test Images

You can use any food photos you have, or create simple test images:

```bash
# Example: Create 1x1 pixel test images using ImageMagick
convert -size 1x1 xc:red meal-photo-1.jpg
convert -size 1x1 xc:green meal-photo-2.jpg
convert -size 1x1 xc:blue meal-photo-3.jpg
convert -size 1x1 xc:gray not-food.jpg
```

Or download sample images:
```bash
# Example: Download from placeholder service
curl https://via.placeholder.com/300/FF6B6B/FFFFFF?text=Meal1 -o meal-photo-1.jpg
curl https://via.placeholder.com/300/4ECDC4/FFFFFF?text=Meal2 -o meal-photo-2.jpg
curl https://via.placeholder.com/300/FFE66D/FFFFFF?text=Meal3 -o meal-photo-3.jpg
```

## Usage in Tests

Tests reference these files using relative paths:

```typescript
await fileInput.setInputFiles([
  path.join(__dirname, '../fixtures/meal-photo-1.jpg'),
  path.join(__dirname, '../fixtures/meal-photo-2.jpg'),
]);
```

## Note

The actual AI analysis during E2E tests will depend on these images containing recognizable food. For proper testing:
- Use real food photos
- Or mock the AI analysis service to return predictable results
