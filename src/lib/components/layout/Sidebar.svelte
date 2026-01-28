<script lang="ts">
	import { enhance } from '$app/forms';
	import type { FolderNode } from '$lib/server/storage';
	import FolderTree from './FolderTree.svelte';

	interface Props {
		folders: FolderNode[];
		expandedFolders: Record<string, boolean>;
		dragonFolder: string | null;
		currentPath: string;
		onToggle: (path: string) => void;
		onContextMenu: (e: MouseEvent, node: FolderNode | null) => void;
		onDragEnter: (path: string, e: DragEvent) => void;
		onDragLeave: (path: string, e: DragEvent) => void;
		onDrop: (e: DragEvent, path: string) => void;
		onFolderDragStart: (e: DragEvent, path: string) => void;
	}

	let {
		folders,
		expandedFolders,
		dragonFolder,
		currentPath,
		onToggle,
		onContextMenu,
		onDragEnter,
		onDragLeave,
		onDrop,
		onFolderDragStart
	}: Props = $props();
</script>

<aside
	class="sidebar-container flex h-full w-64 flex-col border-r border-zinc-800 bg-zinc-900/50"
	oncontextmenu={(e) => onContextMenu(e, null)}
>
	<div class="flex items-center justify-between border-b border-zinc-800 p-4">
		<a href="/" class="text-lg font-bold tracking-tight">Assets</a>
		<form action="/login?/logout" method="POST" use:enhance>
			<button class="text-xs text-zinc-500 hover:text-zinc-300">Logout</button>
		</form>
	</div>

	<nav class="custom-scrollbar flex-1 overflow-y-auto p-4">
		<h3 class="mb-2 px-2 text-xs font-semibold tracking-wider text-zinc-500 uppercase">Folders</h3>
		<ul class="space-y-1">
			<li>
				<div class="group/item flex items-center">
					<a
						href="/"
						onclick={() => onToggle('')}
						oncontextmenu={(e) => onContextMenu(e, null)}
						ondragover={(e) => e.preventDefault()}
						ondragenter={(e) => onDragEnter('', e)}
						ondragleave={(e) => onDragLeave('', e)}
						ondrop={(e) => onDrop(e, '')}
						class="flex flex-1 items-center rounded px-2 py-1 text-sm transition-colors {dragonFolder ===
						''
							? 'bg-blue-600/20 ring-1 ring-blue-500'
							: 'hover:bg-zinc-800'} {currentPath === '/'
							? 'bg-zinc-800 font-medium text-blue-400'
							: 'text-zinc-400'}"
					>
						<span class="mr-2">🏠</span>
						<span class="flex-1 truncate">Root</span>
					</a>
				</div>

				<div class="folder-group">
					<FolderTree
						nodes={folders}
						{expandedFolders}
						{currentPath}
						{dragonFolder}
						{onToggle}
						{onContextMenu}
						{onDragEnter}
						{onDragLeave}
						{onDrop}
						onDragStart={onFolderDragStart}
					/>
				</div>
			</li>
		</ul>
	</nav>
</aside>

<style>
	.custom-scrollbar::-webkit-scrollbar {
		width: 4px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: transparent;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: #27272a;
		border-radius: 10px;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb:hover {
		background: #3f3f46;
	}

	.sidebar-container:hover :global(.folder-group .folder-group) {
		border-left: 1px solid #27272a;
		margin-left: 0.75rem;
		padding-left: 0.25rem;
		transition: border-color 0.2s;
	}

	.sidebar-container :global(.folder-group .folder-group) {
		border-left: 1px solid transparent;
		margin-left: 0.75rem;
		padding-left: 0.25rem;
	}
</style>
