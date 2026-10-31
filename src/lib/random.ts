/** A random source returning a number in [0, 1), like `Math.random`. */
export type RandomSource = () => number;

/** Hashes a string to a 32-bit unsigned seed (FNV-1a). */
export function hashSeed(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Small deterministic PRNG (mulberry32): the same seed always yields the same sequence. */
export function createSeededRandom(seed: string | number): RandomSource {
  let state = (typeof seed === 'string' ? hashSeed(seed) : seed) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Returns a shuffled copy (Fisher-Yates) using the given random source. */
export function shuffle<T>(items: readonly T[], random: RandomSource): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const current = result[index] as T;
    result[index] = result[swap] as T;
    result[swap] = current;
  }
  return result;
}
