import * as React from "react";
import { BehaviorSubject, identity, Observable, OperatorFunction, Subject, Subscription } from "rxjs";
import { distinctUntilChanged, map, scan, skip } from "rxjs/operators";

export type Mutation<T> = (t: T) => T;

export type MapToUnion<T> = T[keyof T];

export type MapToAction<T> = {
  [K in keyof T]: {
    type: K;
    payload: T[K];
  };
};

export type MapToConditionalAction<T> = MapToUnion<MapToAction<T>>;

export interface Action<T = any> {
  type: string | number | symbol;
  payload?: T;
}

export interface Reducer<T, Action> {
  (state: T, action: Action): T;
}

export type Store<T, PayloadType = {}> = {
  readonly stream: BehaviorSubject<T>;
  readonly value: T;
  next(m: Mutation<T>): void;
  dispatch(action: MapToConditionalAction<PayloadType>): void;
  destroy(): void;
  use(): T;
};

export function createStore<T, PayloadType = {}>(
  defaultState: T,
  middleware: OperatorFunction<Mutation<T>, Mutation<T>> = identity,
  reducer: Reducer<T, MapToConditionalAction<PayloadType>> = (s) => s
): Store<T, PayloadType> {
  const mutations = new Subject<Mutation<T>>();
  const stream = new BehaviorSubject(defaultState);

  mutations
    .pipe(
      middleware,
      scan<Mutation<T>, T>((state, mutation) => {
        return mutation(state);
      }, defaultState)
    )
    .subscribe(stream);

  return {
    get stream() {
      return stream;
    },
    get value() {
      return stream.value;
    },
    next(m) {
      mutations.next(m);
    },
    dispatch(action) {
      mutations.next((state) => reducer(state, action));
    },
    //we don't use the name `complete` because it will cause store to terminate when you use pattern like .subscribe(store)
    destroy() {
      mutations.complete();
      stream.complete();
    },
    use() {
      return useObservables(stream)[0];
    },
  };
}

type ObservedValueOf<T> = T extends BehaviorSubject<infer U1>
  ? U1
  : T extends Observable<infer U2>
  ? U2 | null
  : never;

export function useObservables<T>(
  ob: T | undefined | null
): [ObservedValueOf<T>];
export function useObservables<T1, T2>(
  ob1: T1 | undefined | null,
  ob2: T2 | undefined | null
): [ObservedValueOf<T1>, ObservedValueOf<T2>];
export function useObservables<T1, T2, T3>(
  ob1: T1 | undefined | null,
  ob2: T2 | undefined | null,
  ob3: T3 | undefined | null
): [ObservedValueOf<T1>, ObservedValueOf<T2>, ObservedValueOf<T3>];
export function useObservables<T1, T2, T3, T4>(
  ob1: T1 | undefined | null,
  ob2: T2 | undefined | null,
  ob3: T3 | undefined | null,
  ob4: T4 | undefined | null
): [
  ObservedValueOf<T1>,
  ObservedValueOf<T2>,
  ObservedValueOf<T3>,
  ObservedValueOf<T4>
];
export function useObservables<T1, T2, T3, T4, T5>(
  ob1: T1 | undefined | null,
  ob2: T2 | undefined | null,
  ob3: T3 | undefined | null,
  ob4: T4 | undefined | null,
  ob5: T5 | undefined | null
): [
  ObservedValueOf<T1>,
  ObservedValueOf<T2>,
  ObservedValueOf<T3>,
  ObservedValueOf<T4>,
  ObservedValueOf<T5>
];
export function useObservables(...obs: (Observable<any> | null | undefined)[]) {
  const [v, setV] = React.useState(() => {
    return obs.map((x) => (x instanceof BehaviorSubject ? x.value : null));
  });

  React.useEffect(() => {
    let subs = obs.map((x, i) => {
      if (x) {
        return (x instanceof BehaviorSubject ? skip(1)(x) : x).subscribe(
          (x) => {
            setV((value) => {
              value[i] = x;
              return value.slice();
            });
          }
        );
      }
    });
    return () => {
      subs.forEach((x) => x && x.unsubscribe());
    };
  }, obs);

  return v;
}

export function useSink<T>(
  operation: (sub: Subject<T>) => Subscription,
  deps: any[] = []
): Subject<T>["next"] {
  const [subject, next] = React.useMemo<[Subject<T>, Subject<T>["next"]]>(
    () => {
      const subject = new Subject<T>();
      return [subject, subject.next.bind(subject)];
    },
    deps
  );
  React.useEffect(() => {
    const subscription: Subscription = operation(subject);
    return () => {
      subject.complete();
      subscription.unsubscribe(); //this is to prevent leak when operation fn contains some operation like combineLatest
    };
  }, [subject]);
  return next;
}

export function useObservable<T>(ob: Observable<T>) {
  const [value, setValue] = React.useState<T | null>(null);
  React.useEffect(() => {
    const sub = ob.subscribe(setValue);
    return sub.unsubscribe.bind(sub);
  }, [ob]);
  return value;
}

/**
 * @deprecated use useObservables
 */
export function useSource<State, Slice = State>(
  ob: Observable<State>,
  operator: (s: Observable<State>) => Observable<Slice> = map((x) => x as any),
  deps: any[] = []
) {
  const selected = React.useMemo(() => {
    return ob.pipe(operator, distinctUntilChanged<Slice>(shallowEqual));
  }, [ob, ...deps]);
  return useObservable(selected);
}

function shallowEqual(a: any, b: any) {
  if (
    typeof a !== "object" ||
    a === null ||
    typeof b !== "object" ||
    b === null
  ) {
    return a === b;
  } else {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => a[k] === b[k]);
  }
}
