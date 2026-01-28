<script lang="ts">
	import { formatBytes } from '$lib/utils';
	import { goto } from '$app/navigation';

	interface Props {
		path: string;
		imageCount: number;
		totalSize: number;
		sizes: string[];
		parentPath: string | null;
		onAddSize: () => void;
		onRemoveSize: (size: string) => void;
		onUpload: (files: FileList) => void;
	}

	let { path, imageCount, totalSize, sizes, parentPath, onAddSize, onRemoveSize, onUpload }: Props =
		$props();

	function navigateTo(target: string) {
		goto(target);
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<header class="mb-8 flex items-center justify-between" onclick={(e) => e.stopPropagation()}>
	<div class="flex items-center gap-4">
		<div>
			<h1 class="text-2xl font-bold text-white">
				{path ? path.split('/').pop() : 'Root Assets'}
			</h1>
			<nav class="mt-1 flex items-center gap-2 text-sm text-zinc-400">
				<button onclick={() => navigateTo('/')} class="hover:text-white">root</button>
				{#if path}
					{#each path.split('/') as segment, i}
						<span class="text-zinc-600">/</span>
						<button
							onclick={() =>
								navigateTo(
									'/' +
										path
											.split('/')
											.slice(0, i + 1)
											.join('/')
								)}
							class="hover:text-white"
						>
							{segment}
						</button>
					{/each}
				{/if}
			</nav>

			<div class="mt-4 flex flex-wrap items-center gap-2">
				<p class="mr-2 text-sm text-zinc-500">
					{imageCount} images
					<span class="mx-1 opacity-30">•</span>
					{formatBytes(totalSize)}
				</p>

				<div class="mx-2 h-4 w-px bg-zinc-800"></div>

				<span class="text-xs font-semibold tracking-wider text-zinc-600 uppercase"
					>Auto-Resizes:</span
				>
				{#each sizes as size}
					<span
						class="flex items-center gap-1 rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-400"
					>
						{size}
						<button
							onclick={() => onRemoveSize(size)}
							class="ml-1 transition-colors hover:text-red-500"
						>
							×
						</button>
					</span>
				{/each}
				<button
					onclick={onAddSize}
					class="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400 transition-colors hover:bg-zinc-700"
				>
					+ Add Size
				</button>
			</div>
		</div>
	</div>

	<div class="flex items-center gap-4">
		<div
			class="flex items-center gap-1 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/50 p-0.5"
		>
			<button
				onclick={() => navigateTo('/' + (parentPath || ''))}
				class="flex h-9 w-9 items-center justify-center rounded-md text-zinc-500 transition-all hover:bg-zinc-800 hover:text-white {!path
					? 'pointer-events-none opacity-20'
					: ''}"
				title="Go to parent folder"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="m18 15-6-6-6 6" />
				</svg>
			</button>

			<div class="mx-1 h-4 w-px bg-zinc-800"></div>

			<button
				onclick={() => window.history.back()}
				class="flex h-9 w-9 items-center justify-center rounded-md text-zinc-500 transition-all hover:bg-zinc-800 hover:text-white"
				title="Go back"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="m15 18-6-6 6-6" />
				</svg>
			</button>
			<button
				onclick={() => window.history.forward()}
				class="flex h-9 w-9 items-center justify-center rounded-md text-zinc-500 transition-all hover:bg-zinc-800 hover:text-white"
				title="Go forward"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="m9 18 6-6-6-6" />
				</svg>
			</button>
		</div>

		<div class="flex items-center gap-4">
			<label
				class="cursor-pointer rounded-md bg-blue-600 px-4 py-2 font-medium transition-colors hover:bg-blue-700"
			>
				Upload Images
				<input
					type="file"
					name="images"
					multiple
					accept="image/*"
					class="hidden"
					onchange={(e) => {
						if (e.currentTarget.files) {
							onUpload(e.currentTarget.files);
							e.currentTarget.value = '';
						}
					}}
				/>
			</label>
		</div>
	</div>
</header>
