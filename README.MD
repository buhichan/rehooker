# Rehooker
State management powered by rxjs and react hooks.

# API

- ```createStore(defaultState)```
    - create a store with these methods:
        - `getState()`
            - get current state.
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
import {createStore, get, useSubject} from "guguder"
import * as React from "react"
import { Http } from './service/http';
import { from } from 'rxjs';
import { debounceTime, map, tap } from 'rxjs/operators';

const peopleStore = createStore([] as any[])

const http = Http("https://swapi.co/api",{
    headers:{
        'content-type':"application/json"
    }
},res=>res.json())

const getPeople = ()=>useSubject(
    v=>v.pipe(
        tap((e)=>{
            console.log(e)
        }),
        debounceTime(300),
        map(()=>from(http.get('/people/1/') as Promise<any[]>)),
    ).subscribe(v=>{
        peopleStore.dispatch(v.pipe(map(v=>()=>v)))
    })
)

export function App(){
    const people = get(peopleStore.stream)
    return <div>
        <button onClick={getPeople()}>getPeople</button>
        <pre>
            {JSON.stringify(people)}
        </pre>
    </div>
}
```