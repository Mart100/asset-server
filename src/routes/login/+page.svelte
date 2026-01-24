<script lang="ts">
	import { enhance } from '$app/forms';
	let { form } = $props();
</script>

<div class="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
	<div class="w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-900 p-8 shadow-xl">
		<h1 class="mb-6 text-center text-2xl font-bold">Asset Server</h1>

		<form method="POST" action="?/login" use:enhance class="space-y-4">
			<div>
				<label for="password" class="mb-1 block text-sm font-medium text-zinc-400">Password</label>
				<input
					type="password"
					name="password"
					id="password"
					required
					class="w-full rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
				/>
			</div>

			{#if form?.message}
				<p class="text-sm text-red-500">{form.message}</p>
			{/if}

			<button
				type="submit"
				class="w-full rounded-md bg-blue-600 py-2 font-semibold text-white transition-colors hover:bg-blue-700"
			>
				Login
			</button>
		</form>
	</div>
</div>
