import { NextResponse } from 'next/server';
import { createTask, getTasks, updateTask } from '@/lib/firestore/tasks';

export async function GET() {
  try {
    const tasks = await getTasks();
    return NextResponse.json({ success: true, data: tasks });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const newTask = await createTask(data);
    return NextResponse.json({ success: true, data: newTask });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create task' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { id, ...updates } = await req.json();
    await updateTask(id, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update task' }, { status: 500 });
  }
}
