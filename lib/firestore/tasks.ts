import { adminDb, isFirebaseConfigured } from '../firebase-admin';
import { ActionItem } from '../types';

const TASKS_COLLECTION = 'tasks';

const initialSeedTasks: ActionItem[] = [
  {
    id: 'task-1',
    leadId: 'lead-1',
    leadName: 'Ananya Deshmukh',
    task: 'Confirm Sunday 11 AM site visit for Prestige Lakeside Habitat',
    dueDate: Date.now() + 86400000,
    status: 'Pending',
    createdAt: Date.now() - 3600000,
  },
  {
    id: 'task-2',
    leadId: 'lead-3',
    leadName: 'Rohan Mehta',
    task: 'Send bespoke brochure & floor plans for Lodha Sea View 4BHK',
    dueDate: Date.now() + 3600000 * 5,
    status: 'Pending',
    createdAt: Date.now() - 7200000,
  }
];

let memoryTasks: ActionItem[] = [...initialSeedTasks];

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
      const snapshot = await adminDb.collection(TASKS_COLLECTION)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
      
      if (!snapshot.empty) {
        return snapshot.docs.map((doc: any) => doc.data() as ActionItem);
      }
    } catch (error) {
      console.warn('[Firestore] Failed to get tasks from Firebase, using memory store:', error);
    }
  }

  return memoryTasks;
}

export async function updateTask(id: string, updates: Partial<ActionItem>): Promise<void> {
  if (isFirebaseConfigured() && adminDb) {
    try {
      await adminDb.collection(TASKS_COLLECTION).doc(id).update(updates);
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
