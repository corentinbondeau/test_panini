import { prisma } from '@/lib/prisma';

export interface ActiveEvent {
  id: string;
  type: string;
  startTime: Date;
  endTime: Date;
  modification: {
    boosterBonusChance: number;
    recycleCostReduction: number;
  };
}

export async function getActiveEvent(type?: string): Promise<ActiveEvent | null> {
  const now = new Date();
  const where: Record<string, unknown> = {
    active: true,
    startTime: { lte: now },
    endTime: { gte: now },
  };
  if (type) where.type = type;

  const event = await prisma.event.findFirst({ where });
  if (!event) return null;

  return {
    id: event.id,
    type: event.type,
    startTime: event.startTime,
    endTime: event.endTime,
    modification: event.modification as { boosterBonusChance: number; recycleCostReduction: number },
  };
}

export function getEventTimeRemaining(endTime: Date): number {
  return Math.max(0, endTime.getTime() - Date.now());
}

export function formatTimeRemaining(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
}
