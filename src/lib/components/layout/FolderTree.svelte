<script lang="ts">
	import type { FolderNode } from '$lib/server/storage';
	import FolderTree from './FolderTree.svelte';
	import { goto } from '$app/navigation';

	interface Props {
		nodes: FolderNode[];
		expandedFolders: Record<string, boolean>;
		currentPath: string;
		dragonFolder: string | null;
		onToggle: (path: string) => void;
		onContextMenu: (e: MouseEvent, node: FolderNode) => void;
		onDragStart: (e: DragEvent, path: string) => void;
		onDrop: (e: DragEvent, path: string) => void;
		onDragEnter: (path: string, e: DragEvent) => void;
		onDragLeave: (path: string, e: DragEvent) => void;
	}

	let {
		nodes,
		expandedFolders,
		currentPath,
		dragonFolder,
		onToggle,
		onContextMenu,
		onDragStart,
		onDrop,
		onDragEnter,
		onDragLeave
	}: Props = $props();

	function handleNavigate(path: string) {
		const target = `/${path}`;
		if (currentPath === target) {
			onToggle(path);
		} else {
			goto(target);
		}
	}
</script>

<ul class="folder-group space-y-1">
	{#each nodes as node (node.path)}
		{@const isExpanded = expandedFolders[node.path]}
		<li>
			<div class="group/item flex items-center">
				<button
					type="button"
					draggable="true"
					onclick={() => handleNavigate(node.path)}
					oncontextmenu={(e) => onContextMenu(e, node)}
					ondragstart={(e) => onDragStart(e, node.path)}
					ondragover={(e) => e.preventDefault()}
					ondragenter={(e) => onDragEnter(node.path, e)}
					ondragleave={(e) => onDragLeave(node.path, e)}
					ondrop={(e) => onDrop(e, node.path)}
					class="flex flex-1 items-center rounded px-2 py-1 text-left text-sm transition-colors {dragonFolder ===
					node.path
						? 'bg-blue-600/20 ring-1 ring-blue-500'
						: 'hover:bg-zinc-800'} {currentPath === '/' + node.path
						? 'bg-zinc-800 font-medium text-blue-400'
						: 'text-zinc-400'}"
				>
					<span class="mr-2">📁</span>
					<span class="flex-1 truncate">{node.name}</span>

					{#if node.children.length > 0}
						<button
							type="button"
							title={isExpanded ? 'Collapse' : 'Expand'}
							aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
							onclick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								onToggle(node.path);
							}}
							class="ml-2 flex h-4 w-4 items-center justify-center rounded text-zinc-600 transition-all hover:bg-zinc-700 hover:text-zinc-300 {isExpanded
								? 'rotate-90'
								: ''}"
						>
							<svg
								width="10"
								height="10"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="3"
								stroke-linecap="round"
								stroke-linejoin="round"><path d="m9 18 6-6-6-6" /></svg
							>
						</button>
					{/if}
				</button>
			</div>

			{#if node.children.length > 0 && isExpanded}
				<FolderTree
					nodes={node.children}
					{expandedFolders}
					{currentPath}
					{dragonFolder}
					{onToggle}
					{onContextMenu}
					{onDragStart}
					{onDrop}
					{onDragEnter}
					{onDragLeave}
				/>
			{/if}
		</li>
	{/each}
</ul>
