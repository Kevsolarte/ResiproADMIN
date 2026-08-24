import { pb } from '$lib/api/pocketbase';
import type { Income } from './types';

const COLLECTION = 'incomes';

// expand: 'project' asks PocketBase to nest the related project record in the
// response, so the table can show its name instead of a raw id.
// expand: 'project' le pide a PocketBase que anide el project relacionado en la
// respuesta, así la tabla muestra su nombre en vez de un id crudo.
export function listIncomes(): Promise<Income[]> {
	return pb.collection(COLLECTION).getFullList<Income>({ sort: '-date', expand: 'project' });
}

// Same {:placeholder} syntax as FindRecordsByFilter in the Go hook: pb.filter
// escapes the values instead of concatenating them into the query.
// Misma sintaxis {:placeholder} que FindRecordsByFilter en el hook de Go:
// pb.filter escapa los valores en vez de concatenarlos en la query.
export function listIncomesByProject(projectId: string): Promise<Income[]> {
	return pb.collection(COLLECTION).getFullList<Income>({
		filter: pb.filter('project = {:project}', { project: projectId }),
		sort: '-date'
	});
}

// expand is a read-only view of the relation, never something the client sends.
// expand es una vista de solo lectura de la relation, nunca algo que el cliente manda.
export type IncomeInput = Omit<Income, 'id' | 'created' | 'updated' | 'expand'>;

export function createIncome(data: IncomeInput): Promise<Income> {
	return pb.collection(COLLECTION).create<Income>(data);
}

export function updateIncome(id: string, data: Partial<IncomeInput>): Promise<Income> {
	return pb.collection(COLLECTION).update<Income>(id, data);
}

export function deleteIncome(id: string): Promise<boolean> {
	return pb.collection(COLLECTION).delete(id);
}
