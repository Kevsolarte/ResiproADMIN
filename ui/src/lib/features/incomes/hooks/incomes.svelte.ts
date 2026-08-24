import { listIncomes } from '../api';
import type { Income } from '../types';

// Read-only: incomes are created and deleted from the project detail page,
// so the only consumer left here is the dashboard.
// Solo lectura: los ingresos se crean y borran desde el detalle del proyecto,
// así que el único consumidor que queda acá es el dashboard.
export function useIncomes() {
	let incomes = $state<Income[]>([]);
	let loading = $state(true);
	let error = $state('');

	async function load() {
		loading = true;
		error = '';

		try {
			incomes = await listIncomes();
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			loading = false;
		}
	}

	load();

	return {
		get incomes() {
			return incomes;
		},
		get loading() {
			return loading;
		},
		get error() {
			return error;
		},
		reload: load
	};
}
