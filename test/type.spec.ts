import { createStore, useObservables } from '../index';
import { Subject, BehaviorSubject } from 'rxjs';

const store = createStore<
  {
    kkk:3
  },
  {
    a: 1;
    b: 2;
  }
>({
  kkk:3
}, undefined, (state, action) => {
  if (action.type === 'a') {
    // should error
    action.payload = 2;
  }
  return state;
});

store.dispatch({
  type: 'a',
  payload: 1,
});

// should error
store.dispatch({
  type: 'a',
  payload: 2,
});

// const ob = new Subject<number>()
// const b = new BehaviorSubject<string>("111")
// const [r1,r2,r3] = useObservables(store.stream, b, ob)
// const [k] = useObservables(ob)