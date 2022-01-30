export function cleanSet<T>(
  obj: T,
  path: Array<number | string>,
  value: any
): T;
export function cleanSet(obj, ...[path, value, ...rest]) {
  if(!path) return obj;
  if (Array.isArray(obj)) {
    const newObj = [...obj];
    newObj.splice(
      path[0],
      1,
      path.length === 1 ? value : cleanSet(obj[path[0]], path.slice(1), value)
    );
    // @ts-ignore
    return cleanSet(newObj, ...rest);
  } else {
    return cleanSet({
      ...obj,
      [path[0]]:
        path.length === 1
          ? value
          : cleanSet(obj[path[0]], path.slice(1), value),
    // @ts-ignore
    }, ...rest);
  }
}
