// Thousand separators with a neutral "$" prefix: the currency is not decided
// yet, so no ISO code is claimed here.
// Separadores de miles con un "$" neutro: la moneda todavía no está definida,
// así que no se afirma ningún código ISO acá.
export function formatMoney(value: number): string {
	if (!value) return '—';
	return `$${new Intl.NumberFormat('es-CO').format(value)}`;
}
