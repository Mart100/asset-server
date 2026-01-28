<script lang="ts">
	import { formatBytes } from '$lib/utils';
	import { goto } from '$app/navigation';

	interface Props {
		path: string;
		subfolders: { name: string; size: number }[];
		dragonFolder: string | null;
		onFolderDragStart: (e: DragEvent, name: string) => void;
		onFolderDragEnter: (e: DragEvent, name: string) => void;
		onFolderDragLeave: (e: DragEvent, name: string) => void;
		onFolderDrop: (e: DragEvent, name: string) => void;
		onClearSelection: () => void;
	}

	let {
		path,
		subfolders,
		dragonFolder,
		onFolderDragStart,
		onFolderDragEnter,
		onFolderDragLeave,
		onFolderDrop,
		onClearSelection
	}: Props = $props();

	function navigateTo(name: string) {
		onClearSelection();
		goto(`/${path ? path + '/' : ''}${name}`);
	}
</script>

{#if subfolders.length > 0}
	<div class="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
		{#each subfolders as { name, size }}
			<button
				onclick={() => navigateTo(name)}
				draggable="true"
				ondragstart={(e) => onFolderDragStart(e, name)}
				ondragover={(e) => e.preventDefault()}
				ondragenter={(e) => onFolderDragEnter(e, name)}
				ondragleave={(e) => onFolderDragLeave(e, name)}
				ondrop={(e) => onFolderDrop(e, name)}
				class="flex flex-col gap-1 rounded-lg border p-3 text-left transition-all {dragonFolder ===
				name
					? 'border-blue-500 bg-blue-500/10 shadow-lg ring-1 ring-blue-500'
					: 'border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-800'}"
			>
				<div class="flex items-center gap-3">
					<span class="text-xl">📁</span>
					<span class="truncate text-sm font-medium text-zinc-300">{name}</span>
				</div>
				<div class="ml-8 text-[10px] text-zinc-500">
					{formatBytes(size)}
				</div>
			</button>
		{/each}
	</div>
	<div class="mb-8 h-px bg-zinc-800"></div>
{/if}
