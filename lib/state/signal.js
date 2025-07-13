import { isArray, isFunction, isNonNullObject } from "../utils/index";
import TrackingScope from "./TrackingScope";
import { isRunInEffectFreeScope, onScopeDispose } from "./SignalScope";
import State from "./State";

const SignalSource = Symbol("SignalSource");
const SignalPayload = Symbol("PreviousPayload");
const SignalEmitters = Symbol("SignalEmitters");
const PreviousPayload = Symbol("PreviousPayload");
const IsWatchableSignal = Symbol("IsWatchableSignal");
const IsProtectedSignal = Symbol("IsProtectedSignal");
const IsComputedSignal = Symbol("IsComputedSignal");

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
    const watchable = !isRunInEffectFreeScope();
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
            throw new Error("cannot update state of signal in computed effect");
          }
          if (scope.hasTracked(this.get)) {
            payload.newValue = payload.value;
            throw new Error(
              "cannot update state of signal in circular-dependency effect"
            );
          }
          meta[SignalEmitters].add(scope);
        }
      },
      onAfterSet({ payload }) {
        meta[PreviousPayload] = meta[SignalPayload];
        meta[SignalPayload] = { value: payload.value };
      },
      onAfterSubscribe({ payload }) {
        onScopeDispose(payload);
      },
    });
    const meta = {
      [SignalSource]: state,
      [IsWatchableSignal]: watchable,
      [SignalEmitters]: new Set(),
      [PreviousPayload]: { value },
      [SignalPayload]: { value },
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
export const isWatchableSignal = (signal) =>
  signal?.[IsWatchableSignal] === true;
export const isWatchable = (source) =>
  isWatchableSignal(source) ||
  isWatchableSignal(CONTEXT.refererMap.get(source));
export const isComputedSignal = (signal) => !!signal?.[IsComputedSignal];
const checkIsNotActInWatchingScope = (action) => {
  const cause = CONTEXT.getTopWatchingScope();
  if (cause) throw new Error(`cannot ${action} in effect`, { cause });
};

export function useSignal(value) {
  checkIsNotActInWatchingScope(`use signal`);
  const signal = CONTEXT.getSignal(value) || Signal.create(value);
  if (signal[IsProtectedSignal]) return [signal, null];
  return [signal, (value) => (signal[SignalSource].value = value)];
}
export function subscribeStateOfSignal(signalOrRef, handle) {
  try {
    checkIsNotActInWatchingScope(`subscribe signal`);
  } catch (error) {
    if (!error?.cause?.isTrackingSignal) throw error;
  }

  if (!isRunInEffectFreeScope() && isFunction(handle)) {
    const signal = CONTEXT.getSignal(signalOrRef);
    if (isWatchable(signal)) {
      return signal[SignalSource].subscribe((payload) => handle(payload));
    }
  }
  return () => {};
}
export function emitSignal(signal, newValue) {
  if (!signal?.[IsProtectedSignal] && signal?.[SignalSource]) {
    signal[SignalSource].value = newValue;
    return true;
  }
  return false;
}
export function captureSignal(signalOrRef, slient = false) {
  const signal = CONTEXT.getSignal(signalOrRef);
  if (slient) return signal?.[SignalSource].$value$;
  return signal?.();
}

export function watch(
  signals,
  cb,
  { immediate = false, onTrack = null, onTrigger = null, once = false } = {}
) {
  checkIsNotActInWatchingScope(`watch signal`);
  if (isFunction(cb) === false) {
    console.warn("watch callback must be a function");
    return TrackingScope.emptyWatchHandle;
  }
  if (isRunInEffectFreeScope()) return TrackingScope.emptyWatchHandle;
  const isArrSrc = isArray(signals);
  signals = isWatchable(signals)
    ? [signals]
    : isArrSrc
    ? signals.filter(isWatchable)
    : [];
  if (signals.length === 0) return TrackingScope.emptyWatchHandle;
  const effect = () => {
    const oldValues = [];
    const values = signals.map((signal) => {
      oldValues.push(signal[PreviousPayload].value);
      return signal[SignalPayload].value;
    });
    if (isArrSrc) cb(values, oldValues);
    else cb(values[0], oldValues[0]);
    if (once) scope.stop();
  };
  const scope = new WatchingScope(effect, { onTrack, onTrigger });
  scope.run(() => signals.forEach(captureSignal), { signals });
  scope.canTrack = (signal) => false;
  if (immediate) scope.runEffect({});
  return scope.exposeHanlde();
}

export function watchEffect(effect, { onTrack = null, onTrigger = null } = {}) {
  checkIsNotActInWatchingScope(`watch effect`);
  if (isRunInEffectFreeScope()) return TrackingScope.emptyWatchHandle;
  const scope = new WatchingScope(effect, { onTrack, onTrigger });
  scope.runEffect({});
  return scope.exposeHanlde();
}

export function ref2Signal(target, signal) {
  if (!isNonNullObject(target) && !isFunction(target)) {
    throw new Error("cannot ref primitive-type target to signals");
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
  checkIsNotActInWatchingScope(`define signal properties`);
  const [signal, setter] = useSignal(target);
  signal[IsProtectedSignal] = true;
  return [signal, setter];
}

export function computedSignal(
  getter,
  { onTrack = null, onTrigger = null } = {}
) {
  checkIsNotActInWatchingScope(`define computed signal`);
  if (!isFunction(getter)) {
    throw new Error("getter for computed signal must be a function");
  }
  const signal = Signal.create(getter());
  signal[IsProtectedSignal] = true;
  signal[IsComputedSignal] = true;
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
