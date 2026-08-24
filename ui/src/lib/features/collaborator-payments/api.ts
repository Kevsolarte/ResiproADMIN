import { pb } from '$lib/api/pocketbase';
import type { CollaboratorPayment } from './types';

const COLLECTION = 'collaborator_payments';

// Payments made on one project, for the project detail page.
// Los pagos hechos sobre un proyecto, para la página de detalle.
export function listPaymentsByProject(projectId: string): Promise<CollaboratorPayment[]> {
	return pb.collection(COLLECTION).getFullList<CollaboratorPayment>({
		filter: pb.filter('project = {:project}', { project: projectId }),
		sort: '-date',
		expand: 'collaborator'
	});
}

// Who already has payment history, to decide archive vs delete. `fields` trims
// the response to one column: this is a membership test, not a listing.
// Quiénes ya tienen historial de pagos, para decidir archivar o borrar. `fields`
// recorta la respuesta a una sola columna: esto es un test de pertenencia, no un
// listado.
export async function listPaidCollaboratorIds(): Promise<string[]> {
	const rows = await pb
		.collection(COLLECTION)
		.getFullList<{ collaborator: string }>({ fields: 'collaborator' });

	return rows.map((row) => row.collaborator).filter(Boolean);
}

export type CollaboratorPaymentInput = Omit<
	CollaboratorPayment,
	'id' | 'created' | 'updated' | 'expand'
>;

export function createCollaboratorPayment(
	data: CollaboratorPaymentInput
): Promise<CollaboratorPayment> {
	return pb.collection(COLLECTION).create<CollaboratorPayment>(data);
}

export function updateCollaboratorPayment(
	id: string,
	data: Partial<CollaboratorPaymentInput>
): Promise<CollaboratorPayment> {
	return pb.collection(COLLECTION).update<CollaboratorPayment>(id, data);
}

export function deleteCollaboratorPayment(id: string): Promise<boolean> {
	return pb.collection(COLLECTION).delete(id);
}
