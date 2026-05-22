/**
 * Union two arrays of objects by `id`. On id collision the remote (cloud)
 * version wins, since the server copy is treated as canonical. Used to merge a
 * device's local data with the account's cloud data on sign-in.
 */
export function mergeById<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of local) map.set(item.id, item);
  for (const item of remote) map.set(item.id, item); // remote wins
  return Array.from(map.values());
}
