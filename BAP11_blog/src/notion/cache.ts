// A small in-memory cache for Notion responses inside one server instance.
// It shares a request between visitors that arrive at the same time, and keeps serving the last good answer
// when Notion is briefly unavailable. Vercel's CDN does the long-term caching.

const TTL = 10_000;

type Slot = { value?: unknown; at: number; pending?: Promise<unknown> };
const slots = new Map<string, Slot>();

export function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
	const slot = slots.get(key) ?? { at: 0 };
	slots.set(key, slot);

	if (slot.value !== undefined && Date.now() - slot.at < TTL) return Promise.resolve(slot.value as T);
	if (slot.pending) return slot.pending as Promise<T>;

	slot.pending = load()
		.then((value) => {
			slot.value = value;
			slot.at = Date.now();
			return value;
		})
		.catch((error) => {
			if (slot.value === undefined) throw error;
			console.error(`Notion request failed, serving the last good copy of "${key}".`, error);
			return slot.value as T;
		})
		.finally(() => {
			slot.pending = undefined;
		});
	return slot.pending as Promise<T>;
}

/** Forget everything, so the next request reads Notion again. */
export function clearCache() {
	slots.clear();
}
