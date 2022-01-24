export function clamp(min: number, v: number, max: number) {
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

export interface EntriesIteratorItem<T> {
  index: number;
  isFirst: boolean;
  isLast: boolean;
  value: T;
}

export function* entries<T>(arr: Array<T>): Iterable<EntriesIteratorItem<T>> {
  for (const [index, value] of arr.entries()) {
    yield {
      index,
      value,
      isFirst: index === 0,
      isLast: index === arr.length - 1,
    };
  }
}

export function pointDistance(x1: number, y1: number, x2: number, y2: number) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}
