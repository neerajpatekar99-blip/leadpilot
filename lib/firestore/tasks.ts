import { adminDb } from '../firebase-admin';
import { ActionItem } from '../types';

const TASKS_COLLECTION = 'tasks';

export async function createTask(data: Partial<ActionItem>): Promise<ActionItem> {
  const newRef = adminDb.collection(TASKS_COLLECTION).doc();
  const task: ActionItem = {
    ...data,
    id: newRef.id,
    createdAt: Date.now(),
    status: data.status || 'Pending',
  } as ActionItem;
  
  await newRef.set(task);
  return task;
}

export async function getTasks(): Promise<ActionItem[]> {
  const snapshot = await adminDb.collection(TASKS_COLLECTION)
    .orderBy('createdAt', 'desc')
    .get();
  
  return snapshot.docs.map(doc => doc.data() as ActionItem);
}

export async function updateTask(id: string, updates: Partial<ActionItem>): Promise<void> {
  await adminDb.collection(TASKS_COLLECTION).doc(id).update(updates);
}

export async function deleteTask(id: string): Promise<void> {
  await adminDb.collection(TASKS_COLLECTION).doc(id).delete();
}
