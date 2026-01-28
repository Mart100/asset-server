<script lang="ts">
	interface Props {
		visible: boolean;
	}
	let { visible }: Props = $props();
</script>

{#if visible}
	<div
		class="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-blue-600/10 backdrop-blur-[2px]"
	>
		<div
			class="flex flex-col items-center gap-4 rounded-3xl border border-zinc-700 bg-zinc-900 px-12 py-10 shadow-2xl"
		>
			<div
				class="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-600/20 text-blue-500"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="40"
					height="40"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline
						points="17 8 12 3 7 8"
					/><line x1="12" x2="12" y1="3" y2="15" /></svg
				>
			</div>
			<p class="text-xl font-bold text-white">Drop images to upload</p>
			<p class="text-sm text-zinc-400">Files will be processed into WebP format</p>
		</div>
	</div>
{/if}
