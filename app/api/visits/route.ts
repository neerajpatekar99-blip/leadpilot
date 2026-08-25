import { NextResponse } from 'next/server';
import { createVisit, getVisits, updateVisit } from '@/lib/firestore/visits';

export async function GET() {
  try {
    const visits = await getVisits();
    return NextResponse.json({ success: true, data: visits });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch visits' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const newVisit = await createVisit(data);
    return NextResponse.json({ success: true, data: newVisit });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create visit' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { id, ...updates } = await req.json();
    await updateVisit(id, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update visit' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, ...updates } = await req.json();
    await updateVisit(id, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update visit' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing visit id' }, { status: 400 });
    }
    const { deleteVisit } = await import('@/lib/firestore/visits');
    await deleteVisit(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete visit' }, { status: 500 });
  }
}
