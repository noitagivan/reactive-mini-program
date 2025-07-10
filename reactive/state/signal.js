import { isArray, isFunction, isNonNullObject } from "../utils/index";
import TrackingScope from "./TrackingScope";
import { isRunInSilentScope, onScopeDispose } from "./SignalScope";
import State from "./State";

const SignalSource = Symbol("SignalSource");
const WatchableSignal = Symbol("WatchableSignal");
const SignalEmitters = Symbol("SignalEmitters");
const ProtectedSignal = Symbol("ProtectedSignal");
const ComputedSignal = Symbol("ComputedSignal");

const CONTEXT = {
  refererMap: new WeakMap(),
  getSignal(signalOrRef) {
    return isSignal(signalOrRef)
      ? signalOrRef
      : this.refererMap.get(signalOrRef);
  },

  watchingScopeStack: [null],
  pushWatchingScope(scope) {
    this.watchingScopeStack.unshift(scope);
  },
  popWatchingScope() {
    if (this.watchingScopeStack.length > 1) {
      this.watchingScopeStack.shift();
    }
  },
  getTopWatchingScope() {
    return this.watchingScopeStack[0] || null;
  },
};
class WatchingScope extends TrackingScope {
  isEffectOccurring = false;
  isTrackForCompute = false;
  constructor(effect, { isTrackForCompute, ...configs } = {}) {
    super({
      ...configs,
      isSync: isTrackForCompute,
      onEffect: ({ payload }) => {
        this.isEffectOccurring = true;
        this.runEffect(payload);
        this.isEffectOccurring = false;
      },
    });
    this.isTrackForCompute = true;
    this.runEffect = ({ signal }) => (this.run(effect, [signal]), this);
  }
  run(fn, signals) {
    super.run(fn, {
      signals,
      setScope: () => CONTEXT.pushWatchingScope(this),
      resetScope: () => CONTEXT.popWatchingScope(),
    });
  }
}

class Signal {
  static create(value) {
    const watchable = !isRunInSilentScope();
    const state = new State(value, {
      watchable,
      onGet: ({ payload }) =>
        CONTEXT.getTopWatchingScope()?.track({
          signal,
          type: "track",
          value: payload.value,
        }),
      onBeforeSet({ payload }) {
        const scope = CONTEXT.getTopWatchingScope();
        if (scope) {
          if (scope.isTrackForCompute) {
            payload.newValue = payload.value;
            throw new Error("cannot update state in computed scope");
          }
          if (scope.hasTracked(this.get)) {
            payload.newValue = payload.value;
            throw new Error("cannot update state in circular dependency scope");
          }
          meta[SignalEmitters].add(scope);
        }
      },
      onAfterSubscribe({ payload }) {
        onScopeDispose(payload);
      },
    });
    const meta = {
      [SignalSource]: state,
      [WatchableSignal]: watchable,
      [SignalEmitters]: new Set(),
    };
    const signal = new Proxy(Signal, {
      apply: () => state.value,
      get: (t, p) => meta[p],
      set: (t, p, v) => ((meta[p] = v), true),
    });
    return signal;
  }
}

export const isSignal = (signal) => signal?.[SignalSource] !== undefined;
export const isWatchableSignal = (signal) => signal?.[WatchableSignal] === true;
export const isWatchable = (source) =>
  isWatchableSignal(source) ||
  isWatchableSignal(CONTEXT.refererMap.get(source));
export const isComputedSignal = (signal) => !!signal?.[ComputedSignal];

export function useSignal(value) {
  if (CONTEXT.getTopWatchingScope()) {
    console.log("defineProps", CONTEXT.getTopWatchingScope());
    throw new Error("cannot define state in effect");
  }
  const signal = CONTEXT.getSignal(value) || Signal.create(value);
  if (signal[ProtectedSignal]) return [signal, null];
  return [signal, (value) => (signal[SignalSource].value = value)];
}
export function subscribeSignal(signalOrRef, handle) {
  if (!isRunInSilentScope() && isFunction(handle)) {
    const signal = CONTEXT.getSignal(signalOrRef);
    if (isWatchable(signal)) {
      return signal[SignalSource].subscribe((payload) => handle(payload));
    }
  }
  return () => {};
}
export function emitSignal(signal, newValue) {
  if (!signal?.[ProtectedSignal] && signal?.[SignalSource]) {
    signal[SignalSource].value = newValue;
    return true;
  }
  return false;
}
export function captureSignal(signalOrRef) {
  return CONTEXT.getSignal(signalOrRef)?.();
}

export function watch(
  signals,
  cb,
  { immediate = false, onTrack = null, onTrigger = null, once = false } = {}
) {
  if (CONTEXT.getTopWatchingScope()) {
    throw new Error("cannot watch state in effect");
  }
  if (isFunction(cb) === false) {
    console.warn("watch callback must be a function");
    return TrackingScope.emptyWatchHandle;
  }
  if (isRunInSilentScope()) return TrackingScope.emptyWatchHandle;
  signals = isWatchable(signals)
    ? [signals]
    : isArray(signals)
    ? signals.filter(isWatchable)
    : [];
  if (signals.length === 0) return TrackingScope.emptyWatchHandle;
  const effect = () => {
    const values = signals.map(captureSignal);
    cb(...values);
    if (once) scope.stop();
  };
  const scope = new WatchingScope(effect, { onTrack, onTrigger });
  scope.run(() => signals.forEach(captureSignal), { signals });
  scope.canTrack = (signal) => false;
  if (immediate) scope.runEffect({});
  return scope.exposeHanlde();
}

export function watchEffect(effect, { onTrack = null, onTrigger = null } = {}) {
  if (CONTEXT.getTopWatchingScope()) {
    throw new Error("cannot watch effect in effect");
  }
  if (isRunInSilentScope()) return TrackingScope.emptyWatchHandle;
  const scope = new WatchingScope(effect, { onTrack, onTrigger });
  scope.runEffect({});
  return scope.exposeHanlde();
}

export function ref2Signal(target, signal) {
  if (!isNonNullObject(target) && !isFunction(target)) {
    throw new Error("cannot ref primitive-type-value to signals");
  }
  if (isSignal(target)) {
    console.warn("cannot ref signal to signals");
    return false;
  }
  if (CONTEXT.refererMap.get(target)) return false;

  if (isSignal(signal)) {
    CONTEXT.refererMap.set(target, signal);
    return true;
  }
  return false;
}

export function protectedSignal(target) {
  const [signal, set] = useSignal(target);
  signal[ProtectedSignal] = true;
  return [signal, set];
}

export function computedSignal(
  getter,
  { onTrack = null, onTrigger = null } = {}
) {
  if (CONTEXT.getTopWatchingScope()) {
    throw new Error("cannot define computed signal in effect");
  }
  if (!isFunction(getter)) {
    throw new Error("getter for computed signal must be a function");
  }
  const signal = Signal.create(getter());
  signal[ProtectedSignal] = true;
  signal[ComputedSignal] = true;
  signal[SignalEmitters].add(
    new WatchingScope(() => getter(), {
      onTrack,
      onTrigger,
      isSync: true,
      onResult: ({ payload }) => (signal[SignalSource].value = payload),
    }).runEffect({})
  );
  return signal;
}
