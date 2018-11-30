"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var React = require("react");
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
function createStore(defaultState) {
    var currentState = defaultState;
    var subject = new rxjs_1.BehaviorSubject(function (v) { return v; });
    var stream = subject.pipe(operators_1.scan(function (state, mutation) {
        return mutation(state);
    }, defaultState), operators_1.tap(function (v) {
        currentState = v;
    }));
    return {
        getState: function () {
            return currentState;
        },
        stream: stream,
        next: function (m) {
            subject.next(m);
        },
    };
}
exports.createStore = createStore;
function useSink(operation, deps) {
    if (deps === void 0) { deps = []; }
    var _a = React.useMemo(function () {
        var sub = new rxjs_1.Subject();
        return [sub, sub.next.bind(sub)];
    }, deps), sub = _a[0], next = _a[1];
    React.useEffect(function () {
        operation(sub);
        return function () { return sub.complete(); };
    }, [sub]);
    return next;
}
exports.useSink = useSink;
function useObservable(ob) {
    var _a = React.useState(null), value = _a[0], setValue = _a[1];
    React.useEffect(function () {
        var sub = ob.subscribe(setValue);
        return sub.unsubscribe.bind(sub);
    }, [ob]);
    return value;
}
exports.useObservable = useObservable;
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
    if (a === b)
        return true;
    if (a == undefined || b == undefined)
        return false;
    var ka = Object.keys(a);
    var kb = Object.keys(b);
    if (ka.length !== kb.length)
        return false;
    return ka.every(function (k) { return a[k] === b[k]; });
}
//# sourceMappingURL=index.js.map