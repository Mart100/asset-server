<script lang="ts">
	import './layout.css';
	import { page } from '$app/state';
	import { onMount, untrack } from 'svelte';
	import { invalidateAll, goto } from '$app/navigation';
	import type { FolderNode } from '$lib/server/storage';
	import * as api from '$lib/api';

	// Components
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import FolderContextMenu from '$lib/components/layout/FolderContextMenu.svelte';

	interface Props {
		data: {
			folders: FolderNode[];
			expandedFolders?: Record<string, boolean>;
		};
		children: import('svelte').Snippet;
	}

	let { data, children }: Props = $props();

	// Sidebar state
	let expandedFolders = $state<Record<string, boolean>>({});
	let dragonFolder = $state<string | null>(null);

	// Context Menu State
	let menuVisible = $state(false);
	let menuPos = $state({ x: 0, y: 0 });
	let contextFolder = $state<FolderNode | null>(null);

	// Sync state
	$effect(() => {
		if (data.expandedFolders) {
			untrack(() => {
				expandedFolders = { ...data.expandedFolders, ...expandedFolders };
			});
		}
	});

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
		if (Object.keys(expandedFolders).length === 0) {
			const saved = localStorage.getItem('expandedFolders');
			if (saved) {
				try {
					expandedFolders = JSON.parse(saved);
				} catch {}
			}
		}
	});

	$effect(() => {
		const saved = JSON.stringify(expandedFolders);
		localStorage.setItem('expandedFolders', saved);
		document.cookie = `expandedFolders=${encodeURIComponent(saved)}; path=/; max-age=31536000; SameSite=Lax`;
	});

	// --- Handlers ---

	function toggleFolder(path: string) {
		expandedFolders[path] = !expandedFolders[path];
	}

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

	// --- Actions ---

	async function handleNewFolder() {
		const parentPath = contextFolder ? contextFolder.path : '';
		const name = window.prompt(`New folder in ${parentPath || 'root'}:`);
		if (!name) return;

		await api.createFolder(name, parentPath);
		hideMenu();
		expandedFolders[parentPath] = true;
	}

	function handleDownloadZip() {
		const path = contextFolder ? contextFolder.path : '';
		window.location.href = `/api/download/${path}`;
		hideMenu();
	}

	async function handleRename() {
		if (!contextFolder) return;
		const newName = window.prompt(`Rename "${contextFolder.name}" to:`, contextFolder.name);
		if (!newName || newName === contextFolder.name) return;

		await api.renameFolder(contextFolder.path, newName);
		hideMenu();
	}

	async function handleDelete() {
		if (!contextFolder) return;
		if (!window.confirm(`Delete folder "${contextFolder.name}" and all its contents?`)) return;

		const ok = await api.deleteFolder(contextFolder.path);
		if (ok) {
			await goto('/');
		}
		hideMenu();
	}

	// --- Drag & Drop ---

	async function handleMoveImages(filenames: string[], oldPath: string, newPath: string) {
		await api.moveImages(filenames, oldPath, newPath);
	}

	async function handleMoveFolder(oldPath: string, newParentPath: string) {
		await api.moveFolder(oldPath, newParentPath);
	}

	function handleFolderDragStart(e: DragEvent, folderPath: string) {
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'folder', path: folderPath }));
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
				if (parsed.path !== folderPath) handleMoveFolder(parsed.path, folderPath);
				return;
			}
			const filenames = parsed.filenames || (parsed.filename ? [parsed.filename] : []);
			if (filenames.length > 0 && parsed.oldPath !== folderPath) {
				handleMoveImages(filenames, parsed.oldPath, folderPath);
			}
		} catch {}
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
		if (current && related && current.contains(related)) return;
		if (dragonFolder === folderPath) dragonFolder = null;
	}
</script>

<svelte:window onclick={hideMenu} oncontextmenu={(e) => e.preventDefault()} />

<div class="flex h-screen overflow-hidden bg-zinc-950 text-white">
	{#if !page.url.pathname.includes('/login')}
		<Sidebar
			folders={data.folders}
			{expandedFolders}
			{dragonFolder}
			currentPath={page.url.pathname}
			onToggle={toggleFolder}
			onContextMenu={showMenu}
			onDragEnter={handleFolderDragEnter}
			onDragLeave={handleFolderDragLeave}
			onDrop={handleDropToFolder}
			onFolderDragStart={handleFolderDragStart}
		/>

		<main class="relative flex-1 overflow-y-auto">
			{@render children()}
		</main>

		<FolderContextMenu
			visible={menuVisible}
			pos={menuPos}
			{contextFolder}
			onNewFolder={handleNewFolder}
			onDownloadZip={handleDownloadZip}
			onRename={handleRename}
			onDelete={handleDelete}
			onHide={hideMenu}
		/>
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
</style>
