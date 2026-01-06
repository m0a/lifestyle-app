import { openDB, type IDBPDatabase } from 'idb';
import { nanoid } from 'nanoid';

export interface PhotoUploadTask {
  id: string;
  mealId: string;
  photoBlob: Blob;
  displayOrder: number;
  status: 'pending' | 'uploading' | 'complete' | 'failed';
  retryCount: number;
  errorMessage?: string;
  createdAt: number;
  lastAttemptAt?: number;
}

const DB_NAME = 'lifestyle-app-photo-queue';
const DB_VERSION = 1;
const STORE_NAME = 'photoUploadQueue';

class PhotoQueueService {
  private db: IDBPDatabase | null = null;

  async init(): Promise<void> {
    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('status', 'status');
          store.createIndex('mealId', 'mealId');
        }
      },
    });
  }

  private async ensureDb(): Promise<IDBPDatabase> {
    if (!this.db) {
      await this.init();
    }
    return this.db!;
  }

  async addTask(task: Omit<PhotoUploadTask, 'id' | 'status' | 'retryCount' | 'createdAt'>): Promise<string> {
    const db = await this.ensureDb();
    const id = nanoid();

    const fullTask: PhotoUploadTask = {
      ...task,
      id,
      status: 'pending',
      retryCount: 0,
      createdAt: Date.now(),
    };

    await db.add(STORE_NAME, fullTask);
    return id;
  }

  async getTask(id: string): Promise<PhotoUploadTask | undefined> {
    const db = await this.ensureDb();
    return db.get(STORE_NAME, id);
  }

  async getPendingTasks(): Promise<PhotoUploadTask[]> {
    const db = await this.ensureDb();
    const index = db.transaction(STORE_NAME).store.index('status');
    return index.getAll('pending');
  }

  async getTasksByMeal(mealId: string): Promise<PhotoUploadTask[]> {
    const db = await this.ensureDb();
    const index = db.transaction(STORE_NAME).store.index('mealId');
    return index.getAll(mealId);
  }

  async updateTaskStatus(
    id: string,
    status: PhotoUploadTask['status'],
    errorMessage?: string
  ): Promise<void> {
    const db = await this.ensureDb();
    const task = await db.get(STORE_NAME, id);

    if (!task) {
      throw new Error(`Task ${id} not found`);
    }

    task.status = status;
    task.lastAttemptAt = Date.now();

    if (status === 'failed') {
      task.retryCount += 1;
      task.errorMessage = errorMessage;
    }

    await db.put(STORE_NAME, task);
  }

  async deleteTask(id: string): Promise<void> {
    const db = await this.ensureDb();
    await db.delete(STORE_NAME, id);
  }

  async clearCompletedTasks(): Promise<void> {
    const db = await this.ensureDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('status');

    // Delete tasks completed more than 24 hours ago
    const completedTasks = await index.getAll('complete');
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;

    for (const task of completedTasks) {
      if (task.createdAt < cutoff) {
        await store.delete(task.id);
      }
    }

    await tx.done;
  }

  async processQueue(
    uploadFn: (task: PhotoUploadTask) => Promise<void>
  ): Promise<void> {
    const pendingTasks = await this.getPendingTasks();

    for (const task of pendingTasks) {
      // Skip tasks that have failed too many times
      if (task.retryCount >= 3) {
        continue;
      }

      try {
        await this.updateTaskStatus(task.id, 'uploading');
        await uploadFn(task);
        await this.updateTaskStatus(task.id, 'complete');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        await this.updateTaskStatus(task.id, 'failed', errorMessage);
      }
    }
  }
}

export const photoQueueService = new PhotoQueueService();
