import * as React from 'react';
import { Subject,Observable, BehaviorSubject, OperatorFunction, identity, Subscription } from 'rxjs';
import {map, distinctUntilChanged, scan} from "rxjs/operators"

export type Mutation<T> = (t:T)=>T

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
    stream:BehaviorSubject<T>,
    next(m:Mutation<T>):void,
    dispatch(action: MapToConditionalAction<PayloadType>):void,
    destroy():void,
    use():T
}

export function createStore<T, PayloadType = {}>(defaultState:T, middleware:OperatorFunction<Mutation<T>,Mutation<T>>=identity, reducer: Reducer<T, MapToConditionalAction<PayloadType>> = s => s):Store<T, PayloadType>{
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
        dispatch(action) {
            mutations.next(state => reducer(state, action));
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
    if(typeof a !== 'object' || a === null || typeof b !== 'object' || b === null){
        return a === b
    }else{
        const ka = Object.keys(a)
        const kb = Object.keys(b)
        if(ka.length !== kb.length)
            return false
        return ka.every(k=>a[k] === b[k])
    }
}