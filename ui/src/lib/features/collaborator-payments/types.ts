import type { Project } from '$lib/features/projects/types';
import type { Collaborator } from '$lib/features/collaborators/types';

// Mirrors `collaborator_payments`: money going OUT, Resiproco -> collaborator.
// Espeja `collaborator_payments`: plata que SALE, Resiproco -> colaborador.
export interface CollaboratorPayment {
	id: string;
	created: string;
	updated: string;

	collaborator: string; // relation -> collaborators.id
	// Optional in the schema, but the Go hook rejects an empty one when the
	// collaborator's payment_mode is "Per project".
	// Opcional en el schema, pero el hook de Go lo rechaza vacío cuando el
	// payment_mode del colaborador es "Per project".
	project: string;

	amount: number;
	date: string;
	note: string;

	expand?: {
		collaborator?: Collaborator;
		project?: Project;
	};
}
