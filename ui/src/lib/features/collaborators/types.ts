// Mirrors the `collaborators` collection: identity only.
// Espeja la collection `collaborators`: solo identidad.
//
// The payment agreement does NOT live here — it belongs to the project, since
// the same person can be hourly on one project and per-project on another.
// El acuerdo de pago NO vive acá — es del proyecto, porque la misma persona
// puede ser por hora en un proyecto y por proyecto en otro.
export type CollaboratorRole = 'Employee' | 'Developer' | 'Freelancer' | 'Design' | 'Marketing';

export interface Collaborator {
	id: string;
	created: string;
	updated: string;

	name: string;
	email: string;
	role: CollaboratorRole | '';

	// A collaborator who was already paid is archived instead of deleted, so
	// their payments keep naming who received the money.
	// Un colaborador al que ya se le pagó se archiva en vez de borrarse, así sus
	// pagos siguen nombrando a quién recibió la plata.
	archived: boolean;
}

export const ROLE_LABELS: Record<CollaboratorRole, string> = {
	Employee: 'Empleado',
	Developer: 'Developer',
	Freelancer: 'Freelancer',
	Design: 'Diseño',
	Marketing: 'Marketing'
};
