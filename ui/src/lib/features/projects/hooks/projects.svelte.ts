import {
	listProjects,
	createProject,
	updateProject,
	deleteProject,
	setProjectArchived,
	type ProjectInput
} from '../api';
import type { Project } from '../types';

// The .svelte.ts extension is what makes runes work outside a component:
// a plain .ts file would leave $state uncompiled.
// La extensión .svelte.ts es lo que hace funcionar los runes fuera de un
// componente: en un .ts común, $state quedaría sin compilar.
// includeArchived is true for the forms, which need to resolve the name of an
// already-referenced project even after it was archived. The grid passes
// nothing and flips it with the toggle.
// includeArchived va en true para los formularios, que necesitan resolver el
// nombre de un proyecto ya referenciado aunque esté archivado. La grilla no
// pasa nada y lo cambia con el toggle.
export function useProjects(includeArchived = false) {
	let projects = $state<Project[]>([]);
	let loading = $state(true);
	let error = $state('');
	let showArchived = $state(includeArchived);

	async function load() {
		loading = true;
		error = '';

		try {
			projects = await listProjects(showArchived);
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			loading = false;
		}
	}

	// Every mutation reloads the whole list instead of patching it locally.
	// The Go hook rewrites next_payment on the server, so the local record would
	// be stale the moment it is saved — refetching is the only correct read.
	// Cada mutación recarga la lista entera en vez de parchearla localmente.
	// El hook de Go reescribe next_payment en el servidor, así que el record
	// local quedaría desactualizado apenas se guarda — refetchear es lo correcto.
	async function create(input: ProjectInput) {
		await createProject(input);
		await load();
	}

	async function update(id: string, input: Partial<ProjectInput>) {
		await updateProject(id, input);
		await load();
	}

	async function remove(id: string) {
		await deleteProject(id);
		await load();
	}

	async function archive(id: string, archived: boolean) {
		await setProjectArchived(id, archived);
		await load();
	}

	function setShowArchived(value: boolean) {
		showArchived = value;
		return load();
	}

	load();

	return {
		// Getters, never plain values. Runes track reads of a property, so
		// returning `projects` here would copy its value at this instant and
		// the component would never see an update.
		// Getters, nunca valores sueltos. Los runes trackean la lectura de una
		// propiedad, así que devolver `projects` copiaría su valor de este
		// instante y el componente nunca vería una actualización.
		get projects() {
			return projects;
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
