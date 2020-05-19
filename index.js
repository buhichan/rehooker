"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var React = require("react");
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
function createStore(defaultState, middleware, reducer) {
    if (middleware === void 0) { middleware = rxjs_1.identity; }
    if (reducer === void 0) { reducer = function (s) { return s; }; }
    var mutations = new rxjs_1.Subject();
    var stream = new rxjs_1.BehaviorSubject(defaultState);
    mutations
        .pipe(middleware, operators_1.scan(function (state, mutation) {
        return mutation(state);
    }, defaultState))
        .subscribe(stream);
    return {
        get stream() {
            return stream;
        },
        get value() {
            return stream.value;
        },
        next: function (m) {
            mutations.next(m);
        },
        dispatch: function (action) {
            mutations.next(function (state) { return reducer(state, action); });
        },
        //we don't use the name `complete` because it will cause store to terminate when you use pattern like .subscribe(store)
        destroy: function () {
            mutations.complete();
            stream.complete();
        },
        use: function () {
            return useObservables(stream)[0];
        },
    };
}
exports.createStore = createStore;
function useObservables() {
    var obs = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        obs[_i] = arguments[_i];
    }
    var _a = React.useState(function () {
        return obs.map(function (x) { return (x instanceof rxjs_1.BehaviorSubject ? x.value : null); });
    }), v = _a[0], setV = _a[1];
    React.useEffect(function () {
        var sub = rxjs_1.combineLatest(obs.map(function (x) {
            return !x
                ? NullObservable
                : x instanceof rxjs_1.BehaviorSubject
                    ? operators_1.skip(1)(x)
                    : x;
        })).subscribe(function (v) {
            setV(v);
        });
        return function () {
            sub.unsubscribe();
        };
    }, obs);
    return v;
}
exports.useObservables = useObservables;
var NullObservable = rxjs_1.of(null);
/**
 * @deprecated just useEffect
 */
function useSink(operation, deps) {
    if (deps === void 0) { deps = []; }
    var _a = React.useMemo(function () {
        var subject = new rxjs_1.Subject();
        return [subject, subject.next.bind(subject)];
    }, deps), subject = _a[0], next = _a[1];
    React.useEffect(function () {
        var subscription = operation(subject);
        return function () {
            subject.complete();
            subscription.unsubscribe(); //this is to prevent leak when operation fn contains some operation like combineLatest
        };
    }, [subject]);
    return next;
}
exports.useSink = useSink;
/**
 * @deprecated use useObservables
 */
function useObservable(ob) {
    var _a = React.useState(null), value = _a[0], setValue = _a[1];
    React.useEffect(function () {
        var sub = ob.subscribe(setValue);
        return sub.unsubscribe.bind(sub);
    }, [ob]);
    return value;
}
exports.useObservable = useObservable;
/**
 * @deprecated use useObservables
 */
function useSource(ob, operator, deps) {
    if (operator === void 0) { operator = operators_1.map(function (x) { return x; }); }
    if (deps === void 0) { deps = []; }
    var selected = React.useMemo(function () {
        return ob.pipe(operator, operators_1.distinctUntilChanged(shallowEqual));
    }, [ob].concat(deps));
    return useObservable(selected);
}
exports.useSource = useSource;
function shallowEqual(a, b) {
    if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
        return a === b;
    }
    else {
        var ka = Object.keys(a);
        var kb = Object.keys(b);
        if (ka.length !== kb.length)
            return false;
        return ka.every(function (k) { return a[k] === b[k]; });
    }
}
//# sourceMappingURL=index.js.map