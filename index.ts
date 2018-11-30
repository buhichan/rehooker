import * as React from 'react';
import { Subject,Observable, BehaviorSubject } from 'rxjs';
import {map, distinctUntilChanged, scan} from "rxjs/operators"

export function createStore<T>(defaultState:T){
    type Mutation = (t:T)=>T
    const mutations = new Subject<Mutation>()
    const stream = new BehaviorSubject(defaultState)

    mutations.pipe(
        scan<Mutation,T>((state,mutation)=>{
            return mutation(state)
        },defaultState),
    ).subscribe(stream)

    return {
        stream,
        next(m:Mutation){
            mutations.next(m)
        },
    }
}

export function useSink<T>(operation:(sub:Subject<T>)=>void,deps:any[]=[]):Subject<T>['next']{
    const [sub,next] = React.useMemo<[Subject<T>,Subject<T>['next']]>(()=>{
        const sub = new Subject<T>()
        return [sub,sub.next.bind(sub)]
    },deps)
    React.useEffect(()=>{
        operation(sub)
        return ()=>sub.complete()
    },[sub])
    return next
}

export function useObservable<T>(ob:Observable<T>){
    const [value,setValue] = React.useState<T|null>(null)
    React.useEffect(()=>{
        const sub = ob.subscribe(setValue)
        return sub.unsubscribe.bind(sub)
    },[ob])
    return value as T
}

export function useSource<State,Slice=State>(ob:Observable<State>,operator:(s:Observable<State>)=>Observable<Slice>=map(x=>x as any),deps:any[]=[]){
    const selected = React.useMemo(()=>{
        return ob.pipe(
            operator,
            distinctUntilChanged<Slice>(shallowEqual),
        )
    },[ob,...deps])
    return useObservable(selected)
}

function shallowEqual(a:any,b:any){
    if(a===b)
        return true
    if(a==undefined || b==undefined)
        return false
    const ka = Object.keys(a)
    const kb = Object.keys(b)
    if(ka.length !== kb.length)
        return false
    return ka.every(k=>a[k] === b[k])
}