export function catchError<T>(
  promise: Promise<T>,
): Promise<[undefined, T] | [Error, undefined]> {
  return promise.then(
    (value) => [undefined, value],
    (error) => [error, undefined],
  );
} 