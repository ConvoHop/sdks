export function asyncStorage({ onRead, onWrite, onRemove } = {}) {
  const values = new Map(), reads = [], writes = [], removals = [];
  return {
    values, reads, writes, removals,
    async getItem(key) {
      reads.push(key);
      await onRead?.(key);
      return values.get(key) ?? null;
    },
    async setItem(key, value) {
      writes.push({ key, value });
      await onWrite?.(key, value, writes.length);
      values.set(key, value);
    },
    async removeItem(key) {
      removals.push(key);
      await onRemove?.(key);
      values.delete(key);
    },
  };
}
