<script lang="ts">
	interface Props {
		label: string;
		value: string;
		// [stored value, label shown] — the value stays English for the Go hooks.
		// [valor guardado, etiqueta mostrada] — el valor queda en inglés para los hooks de Go.
		options: [string, string][];
		placeholder?: string;
		required?: boolean;
	}

	let {
		label,
		value = $bindable(''),
		options,
		placeholder = 'Seleccionar...',
		required = false
	}: Props = $props();

	const id = $props.id();
</script>

<div>
	<label for={id} class="sidebar-group-label mb-1 block">{label}</label>
	<select
		{id}
		{required}
		bind:value
		class="h-9 w-full rounded-lg bg-muted px-3 text-[11px] text-foreground outline-none focus:ring-1 focus:ring-ring"
	>
		<option value="">{placeholder}</option>
		{#each options as [optionValue, optionLabel] (optionValue)}
			<option value={optionValue}>{optionLabel}</option>
		{/each}
	</select>
</div>
