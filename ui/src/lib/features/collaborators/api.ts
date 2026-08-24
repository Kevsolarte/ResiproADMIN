import { pb } from '$lib/api/pocketbase';
import type { Collaborator } from './types';

const COLLECTION = 'collaborators';

// Archived collaborators are hidden from the team list and from every picker,
// but they still exist, so expand=collaborator keeps resolving their name.
// Los colaboradores archivados se ocultan de la lista del equipo y de todos los
// selectores, pero siguen existiendo, así expand=collaborator sigue resolviendo
// su nombre.
export function listCollaborators(includeArchived = false): Promise<Collaborator[]> {
	return pb.collection(COLLECTION).getFullList<Collaborator>({
		sort: 'name',
		filter: includeArchived ? '' : 'archived = false'
	});
}

export type CollaboratorInput = Omit<Collaborator, 'id' | 'created' | 'updated' | 'archived'>;

// Archiving is its own operation, not part of the edit form.
// Archivar es su propia operación, no parte del formulario de edición.
export function setCollaboratorArchived(id: string, archived: boolean): Promise<Collaborator> {
	return pb.collection(COLLECTION).update<Collaborator>(id, { archived });
}

export function createCollaborator(data: CollaboratorInput): Promise<Collaborator> {
	return pb.collection(COLLECTION).create<Collaborator>(data);
}

export function updateCollaborator(
	id: string,
	data: Partial<CollaboratorInput>
): Promise<Collaborator> {
	return pb.collection(COLLECTION).update<Collaborator>(id, data);
}

export function deleteCollaborator(id: string): Promise<boolean> {
	return pb.collection(COLLECTION).delete(id);
}
