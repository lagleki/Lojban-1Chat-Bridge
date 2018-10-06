/**
 * @param { Promise } promise
 * @param { F= } fallback - fallback data
 * @return { Promise }
 */
export function or<T, E, F = any>(
  promise: Promise<T>,
  fallback?: F
): Promise<[E | null, T | F | undefined]> {
  return promise
    .then<[null, T]>((data: T) => [null, data])
    .catch<[E, F]>(err => {
      return [err, fallback];
    });
}

export default or;
