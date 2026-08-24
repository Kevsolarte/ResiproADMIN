// PocketBase sends dates as "2026-09-20 00:00:00.000Z" — with a space instead
// of the ISO "T". Normalise it so every browser's Date parser accepts it.
// PocketBase manda las fechas como "2026-09-20 00:00:00.000Z" — con un espacio
// en vez de la "T" de ISO. Lo normalizamos para que cualquier navegador lo lea.
export function toDate(value: string): Date | null {
	if (!value) return null;
	const date = new Date(value.replace(' ', 'T'));
	return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: string): string {
	return toDate(value)?.toLocaleDateString('es-CO') ?? '—';
}

export const DAY_MS = 86_400_000;

// <input type="date"> only accepts "YYYY-MM-DD", so trim PocketBase's format.
// <input type="date"> solo acepta "YYYY-MM-DD", así que recortamos el formato
// de PocketBase.
export function toInputDate(value: string): string {
	return value ? value.slice(0, 10) : '';
}
