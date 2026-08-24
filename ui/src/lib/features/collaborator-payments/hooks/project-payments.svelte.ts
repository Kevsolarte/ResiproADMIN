import {
	listPaymentsByProject,
	createCollaboratorPayment,
	updateCollaboratorPayment,
	deleteCollaboratorPayment
} from '../api';
import type { CollaboratorPaymentInput } from '../api';
import type { CollaboratorPayment } from '../types';

// Collaborator payments of one single project, for the project detail page.
// Los pagos al colaborador de un solo proyecto, para la página de detalle.
export function useProjectPayments(projectId: string) {
	let payments = $state<CollaboratorPayment[]>([]);
	let loading = $state(true);
	let error = $state('');

	async function load() {
		loading = true;
		error = '';

		try {
			payments = await listPaymentsByProject(projectId);
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			loading = false;
		}
	}

	async function create(input: CollaboratorPaymentInput) {
		await createCollaboratorPayment(input);
		await load();
	}

	async function update(id: string, input: Partial<CollaboratorPaymentInput>) {
		await updateCollaboratorPayment(id, input);
		await load();
	}

	async function remove(id: string) {
		await deleteCollaboratorPayment(id);
		await load();
	}

	load();

	return {
		get payments() {
			return payments;
		},
		get loading() {
			return loading;
		},
		get error() {
			return error;
		},
		get total() {
			return payments.reduce((sum, payment) => sum + (payment.amount ?? 0), 0);
		},
		reload: load,
		create,
		update,
		remove
	};
}
