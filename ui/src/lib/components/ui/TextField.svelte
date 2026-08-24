<script lang="ts">
	interface Props {
		label: string;
		value: string | number;
		type?: 'text' | 'email' | 'number' | 'date';
		placeholder?: string;
		required?: boolean;
		// Numeric constraints. step="any" is what allows decimals: the default
		// step of 1 silently marks 12.50 as invalid.
		// Restricciones numéricas. step="any" es lo que habilita los decimales:
		// el step por defecto de 1 marca 12.50 como inválido sin avisar.
		min?: number | string;
		step?: number | string;
	}

	let {
		label,
		value = $bindable(''),
		type = 'text',
		placeholder = '',
		required = false,
		min,
		step
	}: Props = $props();

	const id = $props.id();
</script>

<div>
	<label for={id} class="sidebar-group-label mb-1 block">{label}</label>
	<!-- Svelte cannot bind:value with a dynamic `type`, so each type gets its
	     own input. Both share the exact same classes.
	     Svelte no puede hacer bind:value con un `type` dinámico, así que cada
	     tipo tiene su input. Los dos comparten exactamente las mismas clases. -->
	{#if type === 'number'}
		<input
			{id}
			type="number"
			{placeholder}
			{required}
			{min}
			{step}
			bind:value
			class="h-9 w-full rounded-lg bg-muted px-3 text-[11px] text-foreground outline-none focus:ring-1 focus:ring-ring"
		/>
	{:else}
		<input
			{id}
			{type}
			{placeholder}
			{required}
			bind:value
			class="h-9 w-full rounded-lg bg-muted px-3 text-[11px] text-foreground outline-none focus:ring-1 focus:ring-ring"
		/>
	{/if}
</div>
