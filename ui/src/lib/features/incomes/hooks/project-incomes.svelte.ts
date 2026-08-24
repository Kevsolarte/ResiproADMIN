import {
	listIncomesByProject,
	createIncome,
	updateIncome,
	deleteIncome,
	type IncomeInput
} from '../api';
import type { Income } from '../types';

// Incomes of one single project, for the project detail page.
// Los ingresos de un solo proyecto, para la página de detalle.
export function useProjectIncomes(projectId: string) {
	let incomes = $state<Income[]>([]);
	let loading = $state(true);
	let error = $state('');

	async function load() {
		loading = true;
		error = '';

		try {
			incomes = await listIncomesByProject(projectId);
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			loading = false;
		}
	}

	async function create(input: IncomeInput) {
		await createIncome(input);
		await load();
	}

	async function update(id: string, input: Partial<IncomeInput>) {
		await updateIncome(id, input);
		await load();
	}

	async function remove(id: string) {
		await deleteIncome(id);
		await load();
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
		get total() {
			return incomes.reduce((sum, income) => sum + (income.amount ?? 0), 0);
		},
		reload: load,
		create,
		update,
		remove
	};
}
