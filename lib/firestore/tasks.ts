import { adminDb, isFirebaseConfigured } from '../firebase-admin';
import { ActionItem } from '../types';

const TASKS_COLLECTION = 'tasks';

const initialSeedTasks: ActionItem[] = [];

let memoryTasks: ActionItem[] = [];

export async function createTask(data: Partial<ActionItem>): Promise<ActionItem> {
  const task: ActionItem = {
    id: `task-${Date.now()}`,
    leadId: data.leadId || '',
    leadName: data.leadName || 'Lead',
    task: data.task || 'Follow up with lead',
    dueDate: data.dueDate || Date.now() + 86400000,
    status: data.status || 'Pending',
    createdAt: Date.now(),
    ...data,
  } as ActionItem;

  if (isFirebaseConfigured() && adminDb) {
    try {
      await adminDb.collection(TASKS_COLLECTION).doc(task.id).set(task);
      return task;
    } catch (error) {
      console.warn('[Firestore] Failed to create task in Firebase, using memory store:', error);
    }
  }

  memoryTasks.unshift(task);
  return task;
}

export async function getTasks(): Promise<ActionItem[]> {
  if (isFirebaseConfigured() && adminDb) {
    try {
      let snapshot;
      try {
        snapshot = await adminDb.collection(TASKS_COLLECTION)
          .orderBy('createdAt', 'desc')
          .limit(50)
          .get();
      } catch {
        snapshot = await adminDb.collection(TASKS_COLLECTION).limit(50).get();
      }
      
      return snapshot.docs
        .map((doc: any) => ({ id: doc.id, ...doc.data() } as ActionItem))
        .sort((a: ActionItem, b: ActionItem) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch (error) {
      console.warn('[Firestore] Failed to get tasks from Firebase:', error);
      return [];
    }
  }

  return memoryTasks;
}

export async function updateTask(id: string, updates: Partial<ActionItem>): Promise<void> {
  if (isFirebaseConfigured() && adminDb) {
    try {
      await adminDb.collection(TASKS_COLLECTION).doc(id).set(updates, { merge: true });
      return;
    } catch (error) {
      console.warn('[Firestore] Failed to update task in Firebase:', error);
    }
  }

  const idx = memoryTasks.findIndex(t => t.id === id);
  if (idx !== -1) {
    memoryTasks[idx] = { ...memoryTasks[idx], ...updates };
  }
}

export async function deleteTask(id: string): Promise<void> {
  if (isFirebaseConfigured() && adminDb) {
    try {
      await adminDb.collection(TASKS_COLLECTION).doc(id).delete();
      return;
    } catch (error) {
      console.warn('[Firestore] Failed to delete task in Firebase:', error);
    }
  }

  memoryTasks = memoryTasks.filter(t => t.id !== id);
}
