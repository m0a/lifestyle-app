import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

// Types for offline storage
export interface PendingOperation {
  id: string;
  type: 'weight' | 'meal' | 'exercise';
  action: 'create' | 'update' | 'delete';
  data: unknown;
  createdAt: string;
  retryCount: number;
}

export interface CachedWeight {
  id: string;
  weight: number;
  recordedAt: string;
  createdAt: string;
  isPending?: boolean;
}

export interface CachedMeal {
  id: string;
  mealType: string;
  description: string;
  calories: number | null;
  recordedAt: string;
  createdAt: string;
  isPending?: boolean;
}

export interface CachedExercise {
  id: string;
  exerciseType: string;
  durationMinutes: number;
  recordedAt: string;
  createdAt: string;
  isPending?: boolean;
}

interface HealthTrackerDB extends DBSchema {
  pendingOperations: {
    key: string;
    value: PendingOperation;
    indexes: {
      'by-type': string;
      'by-created': string;
    };
  };
  weights: {
    key: string;
    value: CachedWeight;
    indexes: {
      'by-recorded': string;
    };
  };
  meals: {
    key: string;
    value: CachedMeal;
    indexes: {
      'by-recorded': string;
    };
  };
  exercises: {
    key: string;
    value: CachedExercise;
    indexes: {
      'by-recorded': string;
    };
  };
  metadata: {
    key: string;
    value: {
      key: string;
      value: unknown;
      updatedAt: string;
    };
  };
}

const DB_NAME = 'health-tracker-offline';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<HealthTrackerDB> | null = null;

export async function getDb(): Promise<IDBPDatabase<HealthTrackerDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<HealthTrackerDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Pending operations store
      if (!db.objectStoreNames.contains('pendingOperations')) {
        const pendingStore = db.createObjectStore('pendingOperations', {
          keyPath: 'id',
        });
        pendingStore.createIndex('by-type', 'type');
        pendingStore.createIndex('by-created', 'createdAt');
      }

      // Weights cache store
      if (!db.objectStoreNames.contains('weights')) {
        const weightsStore = db.createObjectStore('weights', { keyPath: 'id' });
        weightsStore.createIndex('by-recorded', 'recordedAt');
      }

      // Meals cache store
      if (!db.objectStoreNames.contains('meals')) {
        const mealsStore = db.createObjectStore('meals', { keyPath: 'id' });
        mealsStore.createIndex('by-recorded', 'recordedAt');
      }

      // Exercises cache store
      if (!db.objectStoreNames.contains('exercises')) {
        const exercisesStore = db.createObjectStore('exercises', { keyPath: 'id' });
        exercisesStore.createIndex('by-recorded', 'recordedAt');
      }

      // Metadata store
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' });
      }
    },
  });

  return dbInstance;
}

// Generate unique ID for pending operations
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Pending Operations
export async function addPendingOperation(
  operation: Omit<PendingOperation, 'id' | 'createdAt' | 'retryCount'>
): Promise<string> {
  const db = await getDb();
  const id = generateId();
  const pendingOp: PendingOperation = {
    ...operation,
    id,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };
  await db.add('pendingOperations', pendingOp);
  return id;
}

export async function getPendingOperations(): Promise<PendingOperation[]> {
  const db = await getDb();
  return db.getAllFromIndex('pendingOperations', 'by-created');
}

export async function getPendingOperationsByType(
  type: PendingOperation['type']
): Promise<PendingOperation[]> {
  const db = await getDb();
  return db.getAllFromIndex('pendingOperations', 'by-type', type);
}

export async function removePendingOperation(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('pendingOperations', id);
}

export async function updatePendingOperationRetry(id: string): Promise<void> {
  const db = await getDb();
  const op = await db.get('pendingOperations', id);
  if (op) {
    op.retryCount += 1;
    await db.put('pendingOperations', op);
  }
}

export async function getPendingCount(): Promise<number> {
  const db = await getDb();
  return db.count('pendingOperations');
}

// Weights Cache
export async function cacheWeights(weights: CachedWeight[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('weights', 'readwrite');
  for (const weight of weights) {
    await tx.store.put(weight);
  }
  await tx.done;
}

export async function getCachedWeights(): Promise<CachedWeight[]> {
  const db = await getDb();
  return db.getAllFromIndex('weights', 'by-recorded');
}

export async function addCachedWeight(weight: CachedWeight): Promise<void> {
  const db = await getDb();
  await db.put('weights', weight);
}

export async function removeCachedWeight(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('weights', id);
}

// Meals Cache
export async function cacheMeals(meals: CachedMeal[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('meals', 'readwrite');
  for (const meal of meals) {
    await tx.store.put(meal);
  }
  await tx.done;
}

export async function getCachedMeals(): Promise<CachedMeal[]> {
  const db = await getDb();
  return db.getAllFromIndex('meals', 'by-recorded');
}

export async function addCachedMeal(meal: CachedMeal): Promise<void> {
  const db = await getDb();
  await db.put('meals', meal);
}

export async function removeCachedMeal(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('meals', id);
}

// Exercises Cache
export async function cacheExercises(exercises: CachedExercise[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('exercises', 'readwrite');
  for (const exercise of exercises) {
    await tx.store.put(exercise);
  }
  await tx.done;
}

export async function getCachedExercises(): Promise<CachedExercise[]> {
  const db = await getDb();
  return db.getAllFromIndex('exercises', 'by-recorded');
}

export async function addCachedExercise(exercise: CachedExercise): Promise<void> {
  const db = await getDb();
  await db.put('exercises', exercise);
}

export async function removeCachedExercise(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('exercises', id);
}

// Metadata
export async function setMetadata(key: string, value: unknown): Promise<void> {
  const db = await getDb();
  await db.put('metadata', {
    key,
    value,
    updatedAt: new Date().toISOString(),
  });
}

export async function getMetadata<T>(key: string): Promise<T | undefined> {
  const db = await getDb();
  const result = await db.get('metadata', key);
  return result?.value as T | undefined;
}

// Clear all cached data
export async function clearCache(): Promise<void> {
  const db = await getDb();
  await db.clear('weights');
  await db.clear('meals');
  await db.clear('exercises');
  await db.clear('metadata');
}

// Clear everything including pending operations
export async function clearAll(): Promise<void> {
  const db = await getDb();
  await db.clear('pendingOperations');
  await db.clear('weights');
  await db.clear('meals');
  await db.clear('exercises');
  await db.clear('metadata');
}
