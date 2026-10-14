/** Deterministic-ish ID helpers. Prefixed so IDs are self-describing in logs. */

let counter = 0;

export function newId(prefix: string): string {
  counter += 1;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${rand}`;
}

export function incidentCode(id: string): string {
  // Human-readable incident code shown to operators: INC-4F2A9C
  const tail = id.replace(/^inc_/, "").slice(-6).toUpperCase();
  return `INC-${tail}`;
}
