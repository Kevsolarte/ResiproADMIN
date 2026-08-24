<script lang="ts">
	interface Props {
		label: string;
		value: string | number;
		// Optional colour for the number (e.g. a negative balance).
		// Color opcional para el número (por ejemplo, un balance negativo).
		valueClass?: string;
	}

	let { label, value, valueClass = '' }: Props = $props();
</script>

<div class="rounded-lg bg-card px-2.5 py-1.5">
	<p class="stat-card-label truncate">{label}</p>
	<p class="stat-card-value mt-0.5 {valueClass}">{value}</p>
</div>
