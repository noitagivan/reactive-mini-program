import { isArray, isFunction, isPlainObject } from "../utils/index";
import { isRunInEffectFreeScope } from "./EffectScope";
import State from "./State";
import TrackingScope from "./TrackingScope";

const CONTEXT = {
  RETRACKFLAG: false,
  MAPPINGS: new WeakMap(),
  getSignal(target) {
    return isSignal(target) ? target : this.MAPPINGS.get(target);
  },
  WATCHING_SCOPE_STACK: [null],
  pushWatchingScope(scope) {
    this.WATCHING_SCOPE_STACK.unshift(scope);
  },
  popWatchingScope() {
    if (this.WATCHING_SCOPE_STACK.length > 1) {
      this.WATCHING_SCOPE_STACK.shift();
    }
  },
  getTopWatchingScope() {
    return this.WATCHING_SCOPE_STACK[0] || null;
  },
};
const SignalSource = Symbol("SignalSource");
const SignalPayload = Symbol("SignalPayload");
const SignalEmitters = Symbol("SignalEmitters");
const PreviousPayload = Symbol("PreviousPayload");
const IsWatchableSignal = Symbol("IsWatchableSignal");
const IsProtectedSignal = Symbol("IsProtectedSignal");
const IsComputedSignal = Symbol("IsComputedSignal");
const assertIsNotInWatchingScope = (action) => {
  const cause = CONTEXT.getTopWatchingScope();
  if (cause) throw new Error(`cannot ${action} in effect`, { cause });
};

class WatchingScope extends TrackingScope {
  #effect = null;
  isTrackedForCompute = false;
  constructor(effect, { once, isTrackedForCompute, ...configs } = {}) {
    super({
      ...configs,
      isSync: isTrackedForCompute,
    });
    this.#effect = effect;
    this.isTrackedForCompute = true;
    if (once) this.once("effect", this.runEffect.bind(this));
    else this.on("effect", this.runEffect.bind(this));
    this.on = () => () => {};
  }
  run(fn) {
    return super.run(fn, {
      setScope: () => CONTEXT.pushWatchingScope(this),
      resetScope: () => CONTEXT.popWatchingScope(),
    });
  }
  runEffect() {
    this.run(this.#effect);
    return this;
  }
}
class TrackableState extends State {
  constructor(value) {
    const watchable = !isRunInEffectFreeScope();
    super(value, {
      watchable,
      onGet: ({ payload }) => {
        const signal = this.$ref?.deref();
        if (signal) {
          CONTEXT.getTopWatchingScope()?.track({
            signal: this.$ref?.deref(),
            type: "track",
            value: payload.value,
          });
        } else this.freeze();
      },
      onBeforeSet: ({ payload }) => {
        const scope = CONTEXT.getTopWatchingScope();
        if (scope) {
          if (scope.isTrackedForCompute) {
            payload.newValue = payload.value;
            throw new Error("cannot update state of signal in computed effect");
          }
          const signal = this.$ref?.deref();
          if (signal) {
            if (scope.hasTracked(signal)) {
              payload.newValue = payload.value;
              throw new Error(
                "cannot update state of signal in circular-dependency effect"
              );
            }
            signal[SignalEmitters].add(scope);
          } else this.freeze();
        }
      },
      onAfterSet: ({ payload }) => {
        const signal = this.$ref?.deref();
        if (signal) {
          signal[PreviousPayload] = signal[SignalPayload];
          signal[SignalPayload] = { value: payload.value };
        } else this.freeze();
      },
    });
  }
}
class Signal {
  static create(value) {
    const state = new TrackableState(value);
    const meta = {
      [SignalSource]: state,
      [IsWatchableSignal]: state.watchable,
      [SignalEmitters]: new Set(),
      [PreviousPayload]: { value },
      [SignalPayload]: { value },
    };
    const signal = new Proxy(this, {
      apply: () => state.value,
      get: (t, p) => (p === "value" ? state.value : meta[p]),
      set: (t, p, v) => ((meta[p] = v), true),
    });
    state.$ref = new WeakRef(signal);
    return signal;
  }
  static update(
    signal,
    value,
    { forced = false, shouldBeRetrack = false } = {}
  ) {
    if (shouldBeRetrack) CONTEXT.EMIT_FORCED = true;
    if (forced) signal[SignalSource].set(value, true);
    else signal[SignalSource].value = value;
    CONTEXT.RETRACKFLAG = false;
    return true;
  }
}

export const isSignal = (target) => target?.[SignalSource] !== undefined;
export const isWatchableSignal = (target) =>
  target?.[IsWatchableSignal] === true;
export const isWatchable = (target) =>
  isWatchableSignal(target) || isWatchableSignal(CONTEXT.MAPPINGS.get(target));
export const isComputedSignal = (target) => !!target?.[IsComputedSignal];

export function useSignal(value) {
  assertIsNotInWatchingScope(`use signal`);
  const signal = CONTEXT.getSignal(value) || Signal.create(value);
  if (signal[IsProtectedSignal]) return [signal, null];
  return [signal, Signal.update.bind(null, signal)];
}
export function useComputedSignal(
  getter,
  { onTrack = null, onTrigger = null } = {}
) {
  assertIsNotInWatchingScope(`define computed signal`);
  if (!isFunction(getter)) {
    throw new Error("getter for computed signal must be a function");
  }
  const signal = Signal.create();
  signal[IsProtectedSignal] = true;
  signal[IsComputedSignal] = true;
  signal[SignalEmitters].add(
    new WatchingScope(() => getter(), {
      onTrack,
      onTrigger,
      isSync: true,
      onResult: ({ payload }) => (signal[SignalSource].value = payload),
    }).runEffect()
  );
  return signal;
}
export function mapToSignal(target, signal) {
  if (!isPlainObject(target)) {
    throw new Error("signal proxy must be a plain object");
  }
  if (isSignal(target)) {
    console.warn("cannot ref signal to signals");
    return false;
  }
  if (CONTEXT.MAPPINGS.get(target)) return false;
  if (isSignal(signal)) {
    CONTEXT.MAPPINGS.set(target, signal);
    return true;
  }
  return false;
}

export function protectSignal(target) {
  assertIsNotInWatchingScope(`modidy signal properties`);
  const signal = CONTEXT.getSignal(target);
  signal[IsProtectedSignal] = true;
}

export function trackSignal(target, effect) {
  try {
    assertIsNotInWatchingScope(`subscribe signal`);
  } catch (error) {
    if (!error?.cause?.isTrackingSignal) throw error;
  }
  if (!isRunInEffectFreeScope() && isFunction(effect)) {
    const signal = CONTEXT.getSignal(target);
    if (isWatchable(signal)) {
      return signal[SignalSource].subscribe((payload) =>
        effect({ ...payload, shouldBeRetrack: CONTEXT.RETRACKFLAG })
      );
    }
  }
  return () => {};
}
export function emitSignal(target, payload) {
  const signal = CONTEXT.getSignal(target);
  if (!signal?.[IsProtectedSignal] && signal?.[SignalSource]) {
    Signal.update(signal, payload.value, payload);
    return true;
  }
  return false;
}
export function interpretSignal(target, slient = false) {
  const signal = CONTEXT.getSignal(target);
  if (slient) return signal?.[SignalSource].get();
  return signal?.();
}

export function watchSignals(
  signals,
  callback,
  { immediate = false, onTrack = null, onTrigger = null, once = false } = {}
) {
  assertIsNotInWatchingScope(`watch signal`);
  if (isFunction(callback) === false) {
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
    const values = signals?.map((target) => {
      const signal = CONTEXT.getSignal(target);
      oldValues.push(signal[PreviousPayload].value);
      return signal[SignalPayload].value;
    });
    if (isArrSrc) callback?.(values, oldValues);
    else callback?.(values[0], oldValues[0]);
    if (once) CONTEXT.getTopWatchingScope()?.stop();
  };
  const scope = new WatchingScope(effect, { onTrack, onTrigger });
  scope.run(() => signals.forEach(interpretSignal));
  scope.canTrack = (signal) => false;
  if (immediate) scope.runEffect();
  return scope.exposeHanlde(() => ((signals = null), (callback = null)));
}
export function watchEffect(effect, { onTrack = null, onTrigger = null } = {}) {
  assertIsNotInWatchingScope(`watch effect`);
  if (isRunInEffectFreeScope()) return TrackingScope.emptyWatchHandle;
  return new WatchingScope(effect, { onTrack, onTrigger })
    .runEffect()
    .exposeHanlde();
}
