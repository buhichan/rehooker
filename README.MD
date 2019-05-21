# Rehooker
State management powered by rxjs and react hooks.

# API

- ```createStore(defaultState)```
    - create a store with these methods:
        - `user()`
            - a hook that subscribes the latest state.
        - `stream`  
            - get the rxjs observable of state.
        - `next(Mutation):void`
            - Mutation is (previousState)=>nextState
            - dispatch a mutation to change the current state.

- `useSink(operation:(sub:Subject<T>), dependencies: any[]): (value:T)=>void`
    - a hook that creates a event handler which calls the underlying rxjs Subject's next()
    - `dependencies` is the underlying useEffect's second argument

- `useObservable(ob:Observable<T>): T`
    - a hook which get the value of an observable

- `useSource(ob:Observable<T>, operator:(ob:Observable<T>)=>Observable<T> = x=>x, dependencies: any[])`
    - a hook which do 3 things:
        - 1. apply the operator on an observable
        - 2. do shallow compare like react does
        - 3. get the value of an observable
    - `dependencies` is the underlying useEffect's second argument

# Example
```tsx
import {createStore, useSource, useSink} from "rehooker"
import * as React from "react"
import { from } from 'rxjs';
import { debounceTime, map, tap } from 'rxjs/operators';

const userStore = createStore({
    users: [] as any[]
})

const http = {
    get:(url)=>{
        return fetch(url).then(res=>res.json()).then(x=>x.DataSet)
    }
}

export function App(){
    const {users} = userStore.use() //this is a short hand for const {users} = useSource(userStore.stream,[]) || userStore.stream.value
    const getUser = useSink(subject=>subject.pipe( //click event is converted to rxjs subject
        tap((e)=>{
            console.log('button clicked, click event is: ', e)
        }),
        debounceTime(300), // click event is debounced
        switchMap(()=>from(http.get('/people/1/') as Promise<any[]>)),
    ).subscribe(v=>{
        userStore.next(oldState=>({
            ...oldState,
            users:v
        }))
    }),[])
    return <div>
        <button onClick={getUser}>debounced getUser</button>
        <pre>
            {JSON.stringify(users)}
        </pre>
    </div>
}
```