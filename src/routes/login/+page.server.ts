import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import crypto from 'node:crypto';
import type { Actions } from './$types';

export const actions: Actions = {
	login: async ({ request, cookies }) => {
		const data = await request.formData();
		const password = data.get('password');
		const adminPassword = env.ADMIN_PASSWORD || 'change-me';

		if (password === adminPassword) {
			// Use a hash of the password as the session token
			const sessionToken = crypto.createHash('sha256').update(adminPassword).digest('hex');
			cookies.set('session', sessionToken, {
				path: '/',
				httpOnly: true,
				sameSite: 'strict',
				secure: true, // Always secure is better, but might need HTTP on some local setups without HTTPS proxy
				maxAge: 60 * 60 * 24 * 7 // 1 week
			});
			throw redirect(303, '/');
		}

		return fail(400, { message: 'Invalid password' });
	},
	logout: async ({ cookies }) => {
		cookies.delete('session', { path: '/' });
		throw redirect(303, '/login');
	}
};
