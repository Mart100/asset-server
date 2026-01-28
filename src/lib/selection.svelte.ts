/* eslint-disable svelte/prefer-svelte-reactivity */
/**
 * Manages multi-selection logic for a list of items using Svelte 5 runes.
 */
export class SelectionManager {
	#selected = $state<Set<string>>(new Set());
	#lastIndex = $state<number | null>(null);

	get items() {
		return this.#selected;
	}

	get size() {
		return this.#selected.size;
	}

	get lastIndex() {
		return this.#lastIndex;
	}

	has(id: string) {
		return this.#selected.has(id);
	}

	clear() {
		this.#selected = new Set();
		this.#lastIndex = null;
	}

	select(id: string, index?: number) {
		this.#selected = new Set([id]);
		if (index !== undefined) this.#lastIndex = index;
	}

	toggle(id: string, index?: number) {
		const newSet = new Set(this.#selected);
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		this.#selected = newSet;
		if (index !== undefined) this.#lastIndex = index;
	}

	selectRange(currentIndex: number, allItems: string[]) {
		if (this.#lastIndex === null) {
			this.select(allItems[currentIndex], currentIndex);
			return;
		}

		const start = Math.min(currentIndex, this.#lastIndex);
		const end = Math.max(currentIndex, this.#lastIndex);
		const newSet = new Set(this.#selected);

		for (let i = start; i <= end; i++) {
			newSet.add(allItems[i]);
		}
		this.#selected = newSet;
	}

	handleExternalClick(e: MouseEvent, index: number, id: string, allItems: string[]) {
		if (e.ctrlKey || e.metaKey) {
			this.toggle(id, index);
		} else if (e.shiftKey) {
			this.selectRange(index, allItems);
		} else {
			this.select(id, index);
		}
	}
}
