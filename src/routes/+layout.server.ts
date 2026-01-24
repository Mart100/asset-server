import { ensureStorageRoot, getFolderTree } from '$lib/server/storage';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ url, cookies }) => {
	await ensureStorageRoot();
	const folders = await getFolderTree();

	let expandedFolders: Record<string, boolean> = {};
	const cookieValue = cookies.get('expandedFolders');
	if (cookieValue) {
		try {
			expandedFolders = JSON.parse(cookieValue);
		} catch {
			// Ignore
		}
	}

	return {
		folders,
		pathname: url.pathname,
		expandedFolders
	};
};
