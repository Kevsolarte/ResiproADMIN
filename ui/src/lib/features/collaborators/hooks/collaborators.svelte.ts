import {
	listCollaborators,
	createCollaborator,
	updateCollaborator,
	deleteCollaborator,
	setCollaboratorArchived,
	type CollaboratorInput
} from '../api';
import type { Collaborator } from '../types';

// includeArchived is true for the forms, which need to resolve the name of an
// already-referenced collaborator even after they were archived. The team list
// passes nothing and flips it with the toggle.
// includeArchived va en true para los formularios, que necesitan resolver el
// nombre de un colaborador ya referenciado aunque esté archivado. La lista del
// equipo no pasa nada y lo cambia con el toggle.
export function useCollaborators(includeArchived = false) {
	let collaborators = $state<Collaborator[]>([]);
	let loading = $state(true);
	let error = $state('');
	let showArchived = $state(includeArchived);

	async function load() {
		loading = true;
		error = '';

		try {
			collaborators = await listCollaborators(showArchived);
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			loading = false;
		}
	}

	// Refetch after every mutation: next_payment is written by the Go hook on
	// the server, so the local copy is stale as soon as it is saved.
	// Refetch después de cada mutación: next_payment lo escribe el hook de Go en
	// el servidor, así que la copia local queda vieja apenas se guarda.
	async function create(input: CollaboratorInput) {
		await createCollaborator(input);
		await load();
	}

	async function update(id: string, input: Partial<CollaboratorInput>) {
		await updateCollaborator(id, input);
		await load();
	}

	async function remove(id: string) {
		await deleteCollaborator(id);
		await load();
	}

	async function archive(id: string, archived: boolean) {
		await setCollaboratorArchived(id, archived);
		await load();
	}

	function setShowArchived(value: boolean) {
		showArchived = value;
		return load();
	}

	load();

	return {
		get collaborators() {
			return collaborators;
		},
		get loading() {
			return loading;
		},
		get error() {
			return error;
		},
		get showArchived() {
			return showArchived;
		},
		reload: load,
		create,
		update,
		remove,
		archive,
		setShowArchived
	};
}
