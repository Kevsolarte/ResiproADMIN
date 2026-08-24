<script lang="ts">
	interface Props {
		title: string;
		description?: string;
	}

	let { title, description }: Props = $props();
</script>

<div class="mb-5">
	<h1 class="page-title">{title}</h1>
	{#if description}
		<p class="mt-0.5 text-[10px] leading-[14px] text-muted-foreground">{description}</p>
	{/if}
</div>
