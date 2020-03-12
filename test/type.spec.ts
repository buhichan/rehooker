import { createStore } from '../index';

const store = createStore<
  {},
  {
    a: 1;
    b: 2;
  }
>({}, undefined, (state, action) => {
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