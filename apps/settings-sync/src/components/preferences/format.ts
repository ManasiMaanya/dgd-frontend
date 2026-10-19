export function formatActor(actor: string): string {
  return actor.length > 9 ? `${actor.slice(0, 4)}…${actor.slice(-4)}` : actor;
}

export function formatClock(clock: number, actor: string): string {
  return `v${clock} · ${formatActor(actor)}`;
}
