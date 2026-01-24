import { redirect, type Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import crypto from 'node:crypto';

export const handle: Handle = async ({ event, resolve }) => {
	const session = event.cookies.get('session');
	const adminPassword = env.ADMIN_PASSWORD || 'change-me';
	const expectedToken = crypto.createHash('sha256').update(adminPassword).digest('hex');

	if (!session && !event.url.pathname.startsWith('/login')) {
		throw redirect(303, '/login');
	}

	if (session && session !== expectedToken && !event.url.pathname.startsWith('/login')) {
		event.cookies.delete('session', { path: '/' });
		throw redirect(303, '/login');
	}

	return resolve(event);
};
