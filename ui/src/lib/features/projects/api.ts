import { pb } from '$lib/api/pocketbase';
import type { Project } from './types';

// This module is the only place that knows the collection name and the SDK.
// Anything above it works with Project objects and plain promises.
// Este módulo es el único lugar que conoce el nombre de la collection y el SDK.
// Todo lo que está por encima trabaja con objetos Project y promesas comunes.
const COLLECTION = 'projects';

// Archived projects are hidden from the working grid and from every project
// picker, but they still exist: an income's expand=project keeps resolving
// their name, so the history stays attributable.
// Los proyectos archivados se ocultan de la grilla de trabajo y de todos los
// selectores, pero siguen existiendo: el expand=project de un cobro sigue
// resolviendo su nombre, así el historial queda atribuible.
export function listProjects(includeArchived = false): Promise<Project[]> {
	return pb.collection(COLLECTION).getFullList<Project>({
		sort: '-created',
		filter: includeArchived ? '' : 'archived = false'
	});
}

export function getProject(id: string): Promise<Project> {
	return pb.collection(COLLECTION).getOne<Project>(id);
}

// What the client is allowed to send. id/created/updated belong to PocketBase;
// both *_next_payment fields are written by Go hooks, never by the frontend.
// Lo que el cliente tiene permitido mandar. id/created/updated son de
// PocketBase; los dos campos *_next_payment los escriben hooks de Go, nunca el
// frontend.
export type ProjectInput = Omit<
	Project,
	'id' | 'created' | 'updated' | 'next_payment' | 'collaborator_next_payment' | 'archived'
>;

// Archiving is its own operation, not part of the edit form.
// Archivar es su propia operación, no parte del formulario de edición.
export function setProjectArchived(id: string, archived: boolean): Promise<Project> {
	return pb.collection(COLLECTION).update<Project>(id, { archived });
}

export function createProject(data: ProjectInput): Promise<Project> {
	return pb.collection(COLLECTION).create<Project>(data);
}

export function updateProject(id: string, data: Partial<ProjectInput>): Promise<Project> {
	return pb.collection(COLLECTION).update<Project>(id, data);
}

export function deleteProject(id: string): Promise<boolean> {
	return pb.collection(COLLECTION).delete(id);
}
