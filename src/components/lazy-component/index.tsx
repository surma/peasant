import { h, Fragment, VNode } from "preact";
import { useState } from "preact/hooks";
import { JSXInternal } from "preact/src/jsx";

interface PromiseState<T> {
  status: "unknown" | "pending" | "resolved";
  value?: T;
}

export interface Props<T> {
  promise: Promise<T>;
  loading: () => JSXInternal.Element;
  loaded: (v: T) => JSXInternal.Element;
}
export default function LazyComponent<T>({
  promise,
  loading,
  loaded,
}: Props<T>) {
  const [promiseState, setPromiseState] = useState<PromiseState<T>>({
    status: "unknown",
  });
  if (promiseState.status === "unknown") {
    promise.then((value: T) => setPromiseState({ status: "resolved", value }));
    setPromiseState({ status: "pending" });
  }
  if (promiseState.status !== "resolved") {
    return loading();
  }
  return loaded(promiseState.value);
}
