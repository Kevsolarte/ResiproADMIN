import type { Project } from '$lib/features/projects/types';

// Mirrors the `incomes` collection: money coming IN, client -> Resiproco.
// Espeja la collection `incomes`: plata que ENTRA, cliente -> Resiproco.
export interface Income {
	id: string;
	created: string;
	updated: string;

	project: string; // relation -> projects.id
	amount: number;
	date: string;
	note: string;

	// Filled only when the query asks for expand=project. PocketBase returns
	// the related record nested here, like a populate.
	// Solo viene si la query pide expand=project. PocketBase devuelve el record
	// relacionado anidado acá, como un populate.
	expand?: {
		project?: Project;
	};
}
