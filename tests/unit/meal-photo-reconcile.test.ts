import { describe, it, expect, vi } from 'vitest';
import {
  recalculateMealTotals,
  deletePhotosWithFoodItems,
} from '../../packages/backend/src/services/meal-photo.service';

/**
 * Unit tests for the consolidated meal-totals / photo-deletion helpers (#101).
 * A minimal drizzle-shaped mock records the calls so we can assert the
 * reconcile logic without a real DB.
 */
function makeDb() {
  const deleteWhere = vi.fn().mockResolvedValue(undefined);
  const del = vi.fn((_table: unknown) => ({ where: deleteWhere }));
  const updateWhere = vi.fn().mockResolvedValue(undefined);
  const updateSet = vi.fn((_values: Record<string, unknown>) => ({ where: updateWhere }));
  const update = vi.fn((_table: unknown) => ({ set: updateSet }));
  const findMany = vi.fn();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any = {
    delete: del,
    update,
    query: { mealFoodItems: { findMany } },
  };
  return { db, del, update, updateSet, findMany };
}

describe('recalculateMealTotals (#101 SSoT)', () => {
  it('sums food items and persists the totals to meal_records', async () => {
    const { db, updateSet, findMany } = makeDb();
    findMany.mockResolvedValue([
      { name: 'A', calories: 100, protein: 10, fat: 5, carbs: 20 },
      { name: 'B', calories: 50, protein: 5, fat: 3, carbs: 10 },
    ]);

    const totals = await recalculateMealTotals(db, 'meal-1');

    expect(totals).toEqual({ calories: 150, protein: 15, fat: 8, carbs: 30 });
    // Totals + concatenated content are written back to meal_records.
    const written = updateSet.mock.calls[0]![0] as Record<string, unknown>;
    expect(written).toMatchObject({
      calories: 150,
      totalProtein: 15,
      totalFat: 8,
      totalCarbs: 30,
      content: 'A, B',
    });
  });

  it('returns zeros for a meal with no food items', async () => {
    const { db, findMany } = makeDb();
    findMany.mockResolvedValue([]);

    const totals = await recalculateMealTotals(db, 'meal-empty');

    expect(totals).toEqual({ calories: 0, protein: 0, fat: 0, carbs: 0 });
  });
});

describe('deletePhotosWithFoodItems (#101)', () => {
  it("deletes each photo's food items + row, removes the R2 object, then recomputes", async () => {
    const { db, del, findMany } = makeDb();
    // Remaining food items after the photos (and their items) are removed.
    findMany.mockResolvedValue([{ name: 'C', calories: 70, protein: 7, fat: 3, carbs: 12 }]);
    const photoStorage = { deletePhoto: vi.fn().mockResolvedValue(undefined) };

    const totals = await deletePhotosWithFoodItems(
      db,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      photoStorage as any,
      'meal-1',
      [
        { id: 'p1', photoKey: 'k1' },
        { id: 'p2', photoKey: 'k2' },
      ]
    );

    // 2 photos × (food-items delete + photo-row delete) = 4 delete calls.
    expect(del).toHaveBeenCalledTimes(4);
    // Each photo's R2 object is deleted.
    expect(photoStorage.deletePhoto).toHaveBeenCalledWith('k1');
    expect(photoStorage.deletePhoto).toHaveBeenCalledWith('k2');
    // Totals recomputed from the remaining food items.
    expect(totals).toEqual({ calories: 70, protein: 7, fat: 3, carbs: 12 });
  });

  it('tolerates an R2 deletion failure and still recomputes totals', async () => {
    const { db, findMany } = makeDb();
    findMany.mockResolvedValue([]);
    const photoStorage = { deletePhoto: vi.fn().mockRejectedValue(new Error('R2 down')) };

    const totals = await deletePhotosWithFoodItems(
      db,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      photoStorage as any,
      'meal-1',
      [{ id: 'p1', photoKey: 'k1' }]
    );

    expect(totals).toEqual({ calories: 0, protein: 0, fat: 0, carbs: 0 });
  });
});
