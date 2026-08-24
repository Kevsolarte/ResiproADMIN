// Mirrors the `projects` collection in PocketBase.
// Espeja la collection `projects` de PocketBase.

// The Go hooks compare these strings literally (status == "Completed"), so the
// stored values stay in English and only the labels below get translated.
// Los hooks de Go comparan estos strings literalmente, así que los valores
// guardados quedan en inglés y solo se traducen las etiquetas de abajo.
export type ProjectStatus = 'In progress' | 'Paused' | 'Completed';

// What Resiproco agreed to pay the collaborator FOR THIS PROJECT. It lives
// here, not on the person: the same collaborator can be hourly on one project
// and per-project on another.
// Lo que Resiproco acordó pagarle al colaborador POR ESTE PROYECTO. Vive acá y
// no en la persona: el mismo colaborador puede ser por hora en un proyecto y
// por proyecto en otro.
export type CollaboratorPaymentMode = 'Hourly' | 'Per project';

export type ProjectType =
	| 'Landing Page'
	| 'Full Website'
	| 'Blog Site'
	| 'E-Commerce'
	| 'Web App'
	| 'Web Redesign'
	| 'Graphic Identity'
	| 'Digital Marketing'
	| 'Web Audit'
	| 'Digital Consulting';

// Deliberately NOT extending the SDK's RecordModel: that one carries a
// [key: string]: any index signature, which would swallow any typo.
// A propósito NO extiende el RecordModel del SDK: ese trae un index signature
// [key: string]: any que se tragaría cualquier typo.
export interface Project {
	id: string;
	created: string;
	updated: string;

	name: string;
	client: string;
	collaborator: string; // relation -> collaborators.id
	is_monthly: boolean;

	// Empty selects and relations come back as '', never null.
	// Los select y relations vacíos vuelven como '', nunca null.
	type: ProjectType | '';
	status: ProjectStatus | '';

	// Money IN: when the client pays Resiproco next. Written by the incomes hook.
	// Plata que ENTRA: cuándo paga el cliente. La escribe el hook de incomes.
	next_payment: string;

	// Money OUT: the agreement with the collaborator on this project.
	// Plata que SALE: el acuerdo con el colaborador en este proyecto.
	collaborator_payment_mode: CollaboratorPaymentMode | '';
	collaborator_amount: number;
	// Written by the collaborator_payments hook.
	// Lo escribe el hook de collaborator_payments.
	collaborator_next_payment: string;

	// A project with movements is archived instead of deleted, so its incomes
	// and payments keep naming the project they belong to.
	// Un proyecto con movimientos se archiva en vez de borrarse, así sus cobros
	// y pagos siguen nombrando el proyecto al que pertenecen.
	archived: boolean;
}

// UI labels: the code is English, the panel is read in Spanish.
// Etiquetas de UI: el código va en inglés, el panel se lee en español.
export const STATUS_LABELS: Record<ProjectStatus, string> = {
	'In progress': 'En progreso',
	Paused: 'Pausado',
	Completed: 'Completado'
};

export const COLLABORATOR_PAYMENT_MODE_LABELS: Record<CollaboratorPaymentMode, string> = {
	Hourly: 'Por hora',
	'Per project': 'Por proyecto'
};

// The original categories from Resiproco's public form.
// Las categorías originales del formulario público de Resiproco.
export const TYPE_LABELS: Record<ProjectType, string> = {
	'Landing Page': 'Landing Page',
	'Full Website': 'Full Website',
	'Blog Site': 'Blog Site',
	'E-Commerce': 'E-Commerce',
	'Web App': 'Web-App',
	'Web Redesign': 'Re-Diseño web',
	'Graphic Identity': 'Identidad Gráfica',
	'Digital Marketing': 'Marketing Digital',
	'Web Audit': 'Auditoria Web',
	'Digital Consulting': 'Consultoria Digital'
};
