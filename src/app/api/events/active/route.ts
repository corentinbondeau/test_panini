import { NextResponse } from 'next/server';
import { getActiveEvent } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const event = await getActiveEvent('happy_hour');
    if (!event) {
      return NextResponse.json({ active: false });
    }
    return NextResponse.json({
      active: true,
      type: event.type,
      endTime: event.endTime.toISOString(),
      modification: event.modification,
    });
  } catch (error) {
    console.error('Event active error:', error);
    return NextResponse.json({ error: 'Erreur lors de la vérification' }, { status: 500 });
  }
}
