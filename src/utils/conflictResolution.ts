/**
 * Conflict Resolution Utilities
 * Handles concurrent update conflicts using various strategies
 */

export type ConflictStrategy = 'last-write-wins' | 'first-write-wins' | 'merge' | 'manual';

export interface ConflictResolution<T extends Record<string, any> = any> {
  strategy: ConflictStrategy;
  local: T;
  remote: T;
  base?: T; // Original value before local changes
  resolve?: (local: T, remote: T) => T; // Custom resolver function
}

/**
 * Resolve conflict based on strategy
 */
export function resolveConflict<T extends Record<string, any>>(options: ConflictResolution<T>): T {
  const { strategy, local, remote, base, resolve } = options;

  switch (strategy) {
    case 'last-write-wins':
      // Use the most recent timestamp if available
      if (local && typeof local === 'object' && 'updated_at' in local) {
        const localTime = new Date((local as any).updated_at).getTime();
        const remoteTime = new Date((remote as any).updated_at).getTime();
        return remoteTime > localTime ? remote : local;
      }
      // Default to remote (server wins)
      return remote;

    case 'first-write-wins':
      // Use the oldest timestamp
      if (local && typeof local === 'object' && 'updated_at' in local) {
        const localTime = new Date((local as any).updated_at).getTime();
        const remoteTime = new Date((remote as any).updated_at).getTime();
        return remoteTime < localTime ? remote : local;
      }
      // Default to local (client wins)
      return local;

    case 'merge':
      return mergeObjects(local, remote, base);

    case 'manual':
      if (resolve) {
        return resolve(local, remote);
      }
      throw new Error('Manual conflict resolution requires a resolve function');

    default:
      return remote; // Default to server wins
  }
}

/**
 * Merge two objects intelligently
 */
function mergeObjects<T extends Record<string, any>>(
  local: T,
  remote: T,
  base?: T
): T {
  const merged = { ...remote };

  // If we have a base, do a 3-way merge
  if (base) {
    for (const key in local) {
      const localValue = local[key];
      const baseValue = base[key];
      const remoteValue = remote[key];

      // If local changed but remote didn't, keep local
      if (localValue !== baseValue && remoteValue === baseValue) {
        merged[key] = localValue;
      }
      // If both changed, prefer remote (server wins for conflicts)
      else if (localValue !== baseValue && remoteValue !== baseValue) {
        merged[key] = remoteValue;
      }
      // If remote changed, use remote
      else if (remoteValue !== baseValue) {
        merged[key] = remoteValue;
      }
      // Otherwise keep local
      else {
        merged[key] = localValue;
      }
    }
  } else {
    // Simple merge: prefer remote for conflicts, but keep local-only fields
    for (const key in local) {
      if (!(key in remote)) {
        merged[key] = local[key];
      }
    }
  }

  return merged;
}

/**
 * Detect if there's a conflict between local and remote
 */
export function hasConflict<T>(
  local: T,
  remote: T,
  base?: T
): boolean {
  if (!base) {
    // Without base, any difference is a conflict
    return JSON.stringify(local) !== JSON.stringify(remote);
  }

  // With base, conflict exists if both local and remote differ from base
  const localChanged = JSON.stringify(local) !== JSON.stringify(base);
  const remoteChanged = JSON.stringify(remote) !== JSON.stringify(base);

  return localChanged && remoteChanged;
}

/**
 * Create a conflict resolver for a specific entity type
 */
export function createConflictResolver<T extends Record<string, any>>(
  strategy: ConflictStrategy,
  customResolver?: (local: T, remote: T, base?: T) => T
) {
  return (local: T, remote: T, base?: T): T => {
    if (customResolver) {
      return customResolver(local, remote, base);
    }

    return resolveConflict({
      strategy,
      local,
      remote,
      base,
    });
  };
}

/**
 * Version-based conflict resolution (for entities with version numbers)
 */
export function resolveVersionConflict<T extends { version?: number }>(
  local: T,
  remote: T
): { resolved: T; conflict: boolean } {
  const localVersion = local.version ?? 0;
  const remoteVersion = remote.version ?? 0;

  if (localVersion === remoteVersion) {
    // No conflict
    return { resolved: remote, conflict: false };
  }

  if (remoteVersion > localVersion) {
    // Remote is newer
    return { resolved: remote, conflict: false };
  }

  // Conflict: local is newer or versions don't match
  return { resolved: local, conflict: true };
}

