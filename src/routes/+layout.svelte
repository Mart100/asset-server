<script lang="ts">
	import './layout.css';
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import { onMount, untrack } from 'svelte';
	import { invalidateAll, goto } from '$app/navigation';
	import type { FolderNode } from '$lib/server/storage';

	interface Props {
		data: {
			folders: FolderNode[];
			expandedFolders?: Record<string, boolean>;
		};
		children: import('svelte').Snippet;
	}

	let { data, children }: Props = $props();

	// Sidebar state - initialize from data
	let expandedFolders = $state<Record<string, boolean>>({});
	let dragonFolder = $state<string | null>(null);

	// Watch for data changes to sync server-side state if needed
	$effect(() => {
		if (data.expandedFolders) {
			untrack(() => {
				// Prioritize local state over server state to prevent "folding back" during navigation lag
				expandedFolders = { ...data.expandedFolders, ...expandedFolders };
			});
		}
	});

	// Ensure current path parents are always expanded
	$effect(() => {
		const path = page.url.pathname.split('/').filter(Boolean);
		if (path.length > 0) {
			untrack(() => {
				let current = '';
				for (const segment of path) {
					current = current ? `${current}/${segment}` : segment;
					if (expandedFolders[current] === undefined || expandedFolders[current] === false) {
						expandedFolders[current] = true;
					}
				}
			});
		}
	});

	onMount(() => {
		// Recovery if cookie was missing but localStorage has it
		if (Object.keys(expandedFolders).length === 0) {
			const saved = localStorage.getItem('expandedFolders');
			if (saved) {
				try {
					expandedFolders = JSON.parse(saved);
				} catch {
					// Ignore parse errors
				}
			}
		}
	});

	$effect(() => {
		const saved = JSON.stringify(expandedFolders);
		localStorage.setItem('expandedFolders', saved);
		// Sync to cookie for SSR on next request
		document.cookie = `expandedFolders=${encodeURIComponent(saved)}; path=/; max-age=31536000; SameSite=Lax`;
	});

	function toggleFolder(path: string) {
		expandedFolders[path] = !expandedFolders[path];
	}

	// Context Menu State
	let menuVisible = $state(false);
	let menuPos = $state({ x: 0, y: 0 });
	let contextFolder = $state<FolderNode | null>(null);

	function showMenu(e: MouseEvent, folder: FolderNode | null = null) {
		e.preventDefault();
		e.stopPropagation();
		contextFolder = folder;
		menuPos = { x: e.clientX, y: e.clientY };
		menuVisible = true;
	}

	function hideMenu() {
		menuVisible = false;
	}

	function handleDownloadZip() {
		const path = contextFolder ? contextFolder.path : '';
		window.location.href = `/api/download/${path}`;
		hideMenu();
	}

	async function handleNewFolder() {
		const parentPath = contextFolder ? contextFolder.path : '';
		const name = window.prompt(`New folder in ${parentPath || 'root'}:`);
		if (!name) return;

		const formData = new FormData();
		formData.append('name', name);
		formData.append('path', parentPath);

		const response = await fetch('/?/createFolder', { method: 'POST', body: formData });
		if (response.ok) {
			await invalidateAll();
			hideMenu();
		}
	}

	async function handleRename() {
		if (!contextFolder) return;
		const newName = window.prompt(`Rename "${contextFolder.name}" to:`, contextFolder.name);
		if (!newName || newName === contextFolder.name) return;

		const formData = new FormData();
		formData.append('path', contextFolder.path);
		formData.append('name', newName);

		const response = await fetch('/?/renameFolder', { method: 'POST', body: formData });
		if (response.ok) {
			await invalidateAll();
			hideMenu();
		}
	}

	async function handleDelete() {
		if (!contextFolder) return;
		if (!window.confirm(`Delete folder "${contextFolder.name}" and all its contents?`)) return;

		const formData = new FormData();
		formData.append('path', contextFolder.path);

		const response = await fetch('/?/deleteFolder', { method: 'POST', body: formData });
		if (response.ok) {
			await goto('/');
			await invalidateAll();
			hideMenu();
		}
	}

	async function handleMoveImages(filenames: string[], oldPath: string, newPath: string) {
		const formData = new FormData();
		formData.append('filenames', JSON.stringify(filenames));
		formData.append('oldPath', oldPath);
		formData.append('newPath', newPath);

		const response = await fetch('/?/move', { method: 'POST', body: formData });
		if (response.ok) {
			await invalidateAll();
		}
	}

	async function handleMoveFolder(oldPath: string, newParentPath: string) {
		const formData = new FormData();
		formData.append('oldPath', oldPath);
		formData.append('newParentPath', newParentPath);

		const response = await fetch('/?/moveFolder', { method: 'POST', body: formData });
		if (response.ok) {
			await invalidateAll();
		}
	}

	function handleFolderDragStart(e: DragEvent, folderPath: string) {
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData(
				'text/plain',
				JSON.stringify({
					type: 'folder',
					path: folderPath
				})
			);
		}
	}

	function handleDropToFolder(e: DragEvent, folderPath: string) {
		e.preventDefault();
		const dropDataStr = e.dataTransfer?.getData('text/plain');
		if (!dropDataStr) return;
		dragonFolder = null;

		try {
			const parsed = JSON.parse(dropDataStr);

			if (parsed.type === 'folder') {
				if (parsed.path !== folderPath) {
					handleMoveFolder(parsed.path, folderPath);
				}
				return;
			}

			if (parsed.filenames && Array.isArray(parsed.filenames)) {
				if (parsed.oldPath !== folderPath) {
					handleMoveImages(parsed.filenames, parsed.oldPath, folderPath);
				}
			} else if (parsed.filename) {
				if (parsed.oldPath !== folderPath) {
					handleMoveImages([parsed.filename], parsed.oldPath, folderPath);
				}
			}
		} catch {
			// Not our drag data
		}
	}

	function handleFolderDragEnter(folderPath: string, event: DragEvent) {
		event.preventDefault();
		event.stopPropagation();
		dragonFolder = folderPath;
	}

	function handleFolderDragLeave(folderPath: string, event: DragEvent) {
		event.stopPropagation();
		const current = event.currentTarget as Node | null;
		const related = event.relatedTarget as Node | null;
		if (current && related && current.contains(related)) {
			return;
		}
		if (dragonFolder === folderPath) {
			dragonFolder = null;
		}
	}
</script>

<svelte:window onclick={hideMenu} oncontextmenu={(e) => e.preventDefault()} />

{#snippet folderTree(nodes: FolderNode[], depth = 0)}
	<ul class="folder-group space-y-1">
		{#each nodes as node (node.path)}
			{@const isExpanded = expandedFolders[node.path]}
			<li>
				<div class="group/item flex items-center">
					<a
						href="/{node.path}"
						draggable="true"
						onclick={() => {
							const isActive = page.url.pathname === '/' + node.path;
							if (isActive) {
								toggleFolder(node.path);
							} else {
								expandedFolders[node.path] = true;
							}
						}}
						oncontextmenu={(e) => showMenu(e, node)}
						ondragstart={(e) => handleFolderDragStart(e, node.path)}
						ondragover={(e) => e.preventDefault()}
						ondragenter={(e) => handleFolderDragEnter(node.path, e)}
						ondragleave={(e) => handleFolderDragLeave(node.path, e)}
						ondrop={(e) => {
							dragonFolder = null;
							handleDropToFolder(e, node.path);
						}}
						class="flex flex-1 items-center rounded px-2 py-1 text-sm transition-colors {dragonFolder ===
						node.path
							? 'bg-blue-600/20 ring-1 ring-blue-500'
							: 'hover:bg-zinc-800'} {page.url.pathname === '/' + node.path
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
									toggleFolder(node.path);
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
					</a>
				</div>

				{#if node.children.length > 0 && isExpanded}
					{@render folderTree(node.children, depth + 1)}
				{/if}
			</li>
		{/each}
	</ul>
{/snippet}

<div class="flex h-screen overflow-hidden bg-zinc-950 text-white">
	{#if !page.url.pathname.includes('/login')}
		<!-- Sidebar -->
		<aside
			class="sidebar-container flex h-full w-64 flex-col border-r border-zinc-800 bg-zinc-900/50"
			oncontextmenu={(e) => showMenu(e, null)}
		>
			<div class="flex items-center justify-between border-b border-zinc-800 p-4">
				<a href="/" class="text-lg font-bold tracking-tight">Assets</a>
				<form action="/login?/logout" method="POST" use:enhance>
					<button class="text-xs text-zinc-500 hover:text-zinc-300">Logout</button>
				</form>
			</div>

			<nav class="custom-scrollbar flex-1 overflow-y-auto p-4">
				<h3 class="mb-2 px-2 text-xs font-semibold tracking-wider text-zinc-500 uppercase">
					Folders
				</h3>
				<ul class="space-y-1">
					<li>
						<div class="group/item flex items-center">
							<a
								href="/"
								onclick={() => {
									expandedFolders[''] = true;
								}}
								oncontextmenu={(e) => showMenu(e, null)}
								ondragover={(e) => e.preventDefault()}
								ondragenter={(e) => handleFolderDragEnter('', e)}
								ondragleave={(e) => handleFolderDragLeave('', e)}
								ondrop={(e) => {
									dragonFolder = null;
									handleDropToFolder(e, '');
								}}
								class="flex flex-1 items-center rounded px-2 py-1 text-sm transition-colors {dragonFolder ===
								''
									? 'bg-blue-600/20 ring-1 ring-blue-500'
									: 'hover:bg-zinc-800'} {page.url.pathname === '/'
									? 'bg-zinc-800 font-medium text-blue-400'
									: 'text-zinc-400'}"
							>
								<span class="mr-2">🏠</span>
								<span class="flex-1 truncate">Root</span>
							</a>
						</div>

						<div class="folder-group">
							{@render folderTree(data.folders)}
						</div>
					</li>
				</ul>
			</nav>
		</aside>

		<!-- Main content -->
		<main class="relative flex-1 overflow-y-auto">
			{@render children()}
		</main>

		<!-- Context Menu -->
		{#if menuVisible}
			<div
				class="fixed z-50 w-48 rounded-lg border border-zinc-700 bg-zinc-800 p-1 shadow-2xl"
				style="top: {menuPos.y}px; left: {menuPos.x}px"
				onmouseleave={hideMenu}
				role="menu"
				aria-label="Folder actions"
				tabindex="-1"
			>
				<button
					onclick={handleNewFolder}
					role="menuitem"
					class="w-full rounded px-3 py-2 text-left text-sm transition-colors hover:bg-zinc-700"
				>
					New Folder
				</button>
				<button
					onclick={handleDownloadZip}
					role="menuitem"
					class="w-full rounded px-3 py-2 text-left text-sm transition-colors hover:bg-zinc-700"
				>
					Download ZIP
				</button>
				{#if contextFolder}
					<button
						onclick={handleRename}
						role="menuitem"
						class="w-full rounded px-3 py-2 text-left text-sm transition-colors hover:bg-zinc-700"
					>
						Rename
					</button>
					<div class="my-1 border-t border-zinc-700" role="separator"></div>
					<button
						onclick={handleDelete}
						role="menuitem"
						class="w-full rounded bg-red-900/10 px-3 py-2 text-left text-sm text-red-400 transition-colors hover:bg-red-900/30"
					>
						Delete
					</button>
				{/if}
			</div>
		{/if}
	{:else}
		<main class="h-screen flex-1">
			{@render children()}
		</main>
	{/if}
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
	}
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

	.sidebar-container:hover .folder-group .folder-group {
		border-left: 1px solid #27272a;
		margin-left: 0.75rem;
		padding-left: 0.25rem;
		transition: border-color 0.2s;
	}

	.sidebar-container .folder-group .folder-group {
		border-left: 1px solid transparent;
		margin-left: 0.75rem;
		padding-left: 0.25rem;
	}
</style>
