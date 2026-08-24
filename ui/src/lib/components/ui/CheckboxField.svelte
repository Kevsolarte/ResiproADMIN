<script lang="ts">
	interface Props {
		label: string;
		checked: boolean;
		hint?: string;
	}

	let { label, checked = $bindable(false), hint }: Props = $props();

	const id = $props.id();
</script>

<div class="flex items-start gap-2">
	<input
		{id}
		type="checkbox"
		bind:checked
		class="mt-0.5 h-3.5 w-3.5 shrink-0 accent-primary"
	/>
	<div class="min-w-0">
		<label for={id} class="sidebar-link-custom block cursor-pointer">{label}</label>
		{#if hint}
			<p class="text-[9px] leading-3 text-muted-foreground">{hint}</p>
		{/if}
	</div>
</div>
