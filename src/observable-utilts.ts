import type { Transform } from "observables-with-streams";

export function settle<T>(ms: number): Transform<T> {
  let timeout: number | null = null;
  return new TransformStream<T, T>({
    transform(chunk, controller) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      timeout = setTimeout(() => {
        controller.enqueue(chunk);
      }, ms);
    },
  });
}
