import * as React from 'react';
import { Subject,Observable, BehaviorSubject, OperatorFunction, identity, Subscription } from 'rxjs';
import {map, distinctUntilChanged, scan} from "rxjs/operators"

export type Mutation<T> = (t:T)=>T

export type Store<T> = {
    stream:BehaviorSubject<T>,
    next(m:Mutation<T>):void,
    destroy():void,
    use():T
}

export function createStore<T>(defaultState:T, middleware:OperatorFunction<Mutation<T>,Mutation<T>>=identity):Store<T>{
    const mutations = new Subject<Mutation<T>>()
    const stream = new BehaviorSubject(defaultState)

    mutations.pipe(
        middleware,
        scan<Mutation<T>,T>((state,mutation)=>{
            return mutation(state)
        },defaultState)
    ).subscribe(stream)

    return {
        stream,
        next(m){
            mutations.next(m)
        },
        //we don't use the name `complete` because it will cause store to terminate when you use pattern like .subscribe(store)
        destroy(){ 
            mutations.complete()
            stream.complete()
        },
        use(){
            return useObservable(stream) || stream.value
        }
    }
}

export function useSink<T>(operation:(sub:Subject<T>)=>Subscription,deps:any[]=[]):Subject<T>['next']{
    const [subject,next] = React.useMemo<[Subject<T>,Subject<T>['next']]>(()=>{
        const subject = new Subject<T>()
        return [subject,subject.next.bind(subject)]
    },deps)
    React.useEffect(()=>{
        const subscription:Subscription = operation(subject)
        return ()=>{
            subject.complete()
            subscription.unsubscribe() //this is to prevent leak when operation fn contains some operation like combineLatest
        }
    },[subject])
    return next
}

export function useObservable<T>(ob:Observable<T>){
    const [value,setValue] = React.useState<T|null>(null)
    React.useEffect(()=>{
        const sub = ob.subscribe(setValue)
        return sub.unsubscribe.bind(sub)
    },[ob])
    return value
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
    if(typeof a !== 'object'){
        return a === b
    }
    const ka = Object.keys(a)
    const kb = Object.keys(b)
    if(ka.length !== kb.length)
        return false
    return ka.every(k=>a[k] === b[k])
}