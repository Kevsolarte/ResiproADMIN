<script lang="ts">
	import { Repeat, Archive } from '@lucide/svelte';
	import { formatDate } from '$lib/utils/date';
	import { paymentState, PAYMENT_STATE_LABELS, PAYMENT_STATE_CLASSES } from '$lib/utils/payment';
	import { STATUS_LABELS, TYPE_LABELS, type Project } from '../types';

	interface Props {
		project: Project;
	}

	let { project }: Props = $props();

	const dueState = $derived(paymentState(project.next_payment));

	function statusClass(status: Project['status']): string {
		if (status === 'Completed') return 'bg-success/15 text-success';
		if (status === 'Paused') return 'bg-warning/15 text-warning';
		return 'bg-accent text-accent-foreground';
	}
</script>

<!-- An <a>, not a <div onclick>: keyboard focus, middle click and "open in new
     tab" all come for free.
     Un <a>, no un <div onclick>: el foco por teclado, el click del medio y
     "abrir en pestaña nueva" vienen gratis. -->
<a
	href="/panel/projects/{project.id}"
	class="flex flex-col gap-2 rounded-lg bg-card p-3 transition-shadow hover:ring-1 hover:ring-primary/30 {project.archived
		? 'opacity-60'
		: ''}"
>
	<div class="flex items-start justify-between gap-2">
		<div class="min-w-0">
			<p class="truncate text-[11px] leading-4 font-semibold text-foreground">{project.name}</p>
			<p class="truncate text-[9px] leading-3 text-muted-foreground">{project.client || '—'}</p>
		</div>

		{#if project.archived}
			<span
				class="table-cell-custom flex shrink-0 items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-muted-foreground"
			>
				<Archive class="h-2.5 w-2.5" />
				Archivado
			</span>
		{:else if project.status}
			<span
				class="table-cell-custom shrink-0 rounded-md px-1.5 py-0.5 {statusClass(project.status)}"
			>
				{STATUS_LABELS[project.status]}
			</span>
		{/if}
	</div>

	<div class="flex items-center gap-1.5">
		<span class="table-cell-custom rounded-md bg-muted px-1.5 py-0.5 text-muted-foreground">
			{project.type ? TYPE_LABELS[project.type] : 'Sin tipo'}
		</span>

		{#if project.is_monthly}
			<span
				class="table-cell-custom flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-muted-foreground"
			>
				<Repeat class="h-2.5 w-2.5" />
				Mensual
			</span>
		{/if}
	</div>

	<div class="mt-auto flex items-end justify-between gap-2 pt-1">
		<div class="min-w-0">
			<p class="stat-card-label">Próximo cobro</p>
			<p class="stat-card-value mt-0.5">{formatDate(project.next_payment)}</p>
		</div>

		{#if dueState !== 'none'}
			<span class="table-cell-custom shrink-0 rounded-md px-1.5 py-0.5 {PAYMENT_STATE_CLASSES[dueState]}">
				{PAYMENT_STATE_LABELS[dueState]}
			</span>
		{/if}
	</div>
</a>
