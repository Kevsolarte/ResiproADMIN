import { toDate, DAY_MS } from './date';

// How a cached next_payment reads today. Shared by projects and collaborators,
// so the "due window" is defined once instead of per screen.
// Cómo se lee hoy un next_payment cacheado. Lo comparten projects y
// collaborators, así la "ventana de vencimiento" se define una vez y no por pantalla.
export type PaymentState = 'none' | 'overdue' | 'due' | 'upcoming';

export const DUE_WINDOW_DAYS = 7;

export function paymentState(nextPayment: string): PaymentState {
	const date = toDate(nextPayment);
	if (!date) return 'none';

	const diff = date.getTime() - Date.now();
	if (diff < 0) return 'overdue';
	if (diff <= DUE_WINDOW_DAYS * DAY_MS) return 'due';
	return 'upcoming';
}

export const PAYMENT_STATE_LABELS: Record<Exclude<PaymentState, 'none'>, string> = {
	overdue: 'Atrasado',
	due: 'Esta semana',
	upcoming: 'Próximo'
};

export const PAYMENT_STATE_CLASSES: Record<Exclude<PaymentState, 'none'>, string> = {
	overdue: 'bg-destructive/10 text-destructive',
	due: 'bg-warning/15 text-warning',
	upcoming: 'bg-accent text-accent-foreground'
};
