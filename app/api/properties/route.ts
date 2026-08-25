import { NextResponse } from 'next/server';
import { getProperties, createProperty } from '@/lib/firestore/properties';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    
    const properties = await getProperties(status ? { status } : undefined);
    return NextResponse.json({ properties });
  } catch (error) {
    console.error('Error fetching properties:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const newProperty = await createProperty(data);
    return NextResponse.json({ property: newProperty }, { status: 201 });
  } catch (error) {
    console.error('Error creating property:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, ...updates } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing property id' }, { status: 400 });
    }
    const { updateProperty } = await import('@/lib/firestore/properties');
    const updated = await updateProperty(id, updates);
    return NextResponse.json({ success: true, property: updated });
  } catch (error) {
    console.error('Error updating property:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing property id' }, { status: 400 });
    }
    const { deleteProperty } = await import('@/lib/firestore/properties');
    const success = await deleteProperty(id);
    return NextResponse.json({ success });
  } catch (error) {
    console.error('Error deleting property:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
