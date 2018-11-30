import * as React from 'react';
import { Subject,Observable,isObservable,from } from 'rxjs';
import {reduce,map, distinctUntilChanged} from "rxjs/operators"

export function createStore<T>(defaultState:T){
    let currentState:T
    type Mutation = (t:T)=>T
    const subject = new Subject<Mutation>()
    const stream = subject.pipe(
        reduce<Mutation,T>((state,mutation)=>{
            return mutation(state)
        },defaultState)
    )
    const sub = stream.subscribe(v=>{
        currentState = v
    })

    return {
        getState(){
            return currentState
        },
        stream,
        dispatch(maybeMutation:Observable<Mutation> | Promise<Mutation> | Mutation){
            if(isObservable(maybeMutation)){
                maybeMutation.subscribe(subject)
            }else if(maybeMutation instanceof Promise){
                from(maybeMutation).subscribe(subject)
            }else
                subject.next(maybeMutation)
        },
        dispose(){
            sub.unsubscribe()
        }
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