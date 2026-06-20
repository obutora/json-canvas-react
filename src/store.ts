import { useSyncExternalStore } from "react";

/** Minimal external store with selective subscriptions. */
export interface Store<T> {
  getState(): T;
  setState(updater: T | ((prev: T) => T)): void;
  subscribe(listener: () => void): () => void;
}

/** Create a tiny immutable-state store (no external dependency). */
export function createStore<T>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    setState: (updater) => {
      const next =
        typeof updater === "function" ? (updater as (p: T) => T)(state) : updater;
      if (Object.is(next, state)) return;
      state = next;
      listeners.forEach((l) => l());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/**
 * Subscribe to a slice of the store. The selector MUST return a stable
 * reference when the underlying data is unchanged (select raw state slices,
 * not freshly-computed arrays) to satisfy useSyncExternalStore.
 */
export function useStore<T, S>(store: Store<T>, selector: (state: T) => S): S {
  const get = () => selector(store.getState());
  return useSyncExternalStore(store.subscribe, get, get);
}
