import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getFolderTree } from '$lib/server/storage';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.isAdmin) {
		throw error(401, 'Unauthorized');
	}

	try {
		const tree = await getFolderTree();
		return json(tree);
	} catch (e) {
		console.error(e);
		throw error(500, 'Failed to get folder tree');
	}
};
