import { useRef, useState, Reducer } from "preact/hooks";

export type AsyncReducer<State, Action> = (
  ...parameters: Parameters<Reducer<State, Action>>
) => Promise<State>;
export function useAsyncReducer<State, Action>(
  reducer: AsyncReducer<State, Action>,
  initialState: State
) {
  const [_state, setState] = useState<State>(initialState);
  const stateRef = useRef<State>(initialState);
  const streamRef = useRef<WritableStream<Action>>(
    new WritableStream({
      async write(action: Action) {
        const newState = await reducer(stateRef.current, action);
        stateRef.current = newState;
        setState(newState);
      },
    })
  );

  return [
    stateRef.current,
    (action: Action) => {
      const writer = streamRef.current.getWriter();
      writer.write(action);
      writer.releaseLock();
    },
  ] as const;
}
