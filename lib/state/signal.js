import { isArray, isFunction, isPlainObject } from "../utils/index";
import { isRunInEffectFreeScope } from "./EffectScope";
import State from "./State";
import TrackingScope from "./TrackingScope";

/* ******************* *
 *        定义组        *
 * ******************* *
 */

const CONTEXT = {
  RETRACKFLAG: false,
  SIGNAL_CARRIERS: new WeakMap(),
  isSignalCarrier(carrier) {
    return this.SIGNAL_CARRIERS.has(carrier);
  },
  captureCarriedSignal(carrier) {
    return this.SIGNAL_CARRIERS.get(carrier) || null;
  },
  startToCarrySignal(carrier, signal) {
    this.SIGNAL_CARRIERS.set(carrier, signal);
    return true;
  },
  stopToCarrySignal(carrier) {
    return this.SIGNAL_CARRIERS.delete(carrier);
  },
  captureSignal(target) {
    return isTrueSignal(target) ? target : this.captureCarriedSignal(target);
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
const isTrueSignal = (target) => target?.[SignalSource] !== undefined;
const isWatchableSignal = (target) => target?.[IsWatchableSignal] === true;
const assertIsNotInWatchingScope = (action) => {
  const cause = CONTEXT.getTopWatchingScope();
  if (cause) throw new Error(`cannot ${action} in effect`, { cause });
};

/* ******************* *
 *        类型组        *
 * ******************* *
 */

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
      get: (t, p) =>
        p === "__is_signal"
          ? true
          : p === "__is_computed"
          ? signal[IsComputedSignal]
          : p === "value"
          ? state.value
          : meta[p],
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

/* ******************* *
 *        判断组        *
 * ******************* *
 */

/**
 * @template T
 * @param {ParamlessFunction} fn
 * @returns {fn is Getter<T>}
 */
export const isGetter = (fn) => isFunction(fn);

/**
 * @template T
 * @template {boolean} B
 * @param {ParamlessFunction<T> | Record<string, any>} target
 * @param {B} isRealSignal
 * @returns {target is B extends true? SignalImpl<T> : SignalImpl<T> | MutableSignalCarrierImpl<T>}
 */
export const isSignal = (target, isRealSignal) =>
  isRealSignal
    ? isTrueSignal(target)
    : isTrueSignal(target) || CONTEXT.isSignalCarrier(target);

/**
 * @param {*} target
 * @returns {target is SignalImpl<T> | MutableSignalCarrierImpl<T>}
 */
export const isWatchable = (target) =>
  isWatchableSignal(target) ||
  isWatchableSignal(CONTEXT.captureCarriedSignal(target));

/**
 * @template T
 * @param {ParamlessFunction<T> | Record<string, any>} target
 * @returns {target is ComputedSignalImpl<T>}
 */
export const isComputedSignal = (target) =>
  !!CONTEXT.captureSignal(target)?.[IsComputedSignal];

/* ******************* *
 *        创建组        *
 * ******************* *
 */

/**
 * Create And Use Signal
 *
 * @template T
 * @param {T} value
 * @returns {[SignalImpl<T>, SignalEmitter<T>]}
 */
export function useSignal(value) {
  assertIsNotInWatchingScope(`use signal`);
  const signal = CONTEXT.captureSignal(value) || Signal.create(value);
  if (signal[IsProtectedSignal]) return [signal, null];
  return [signal, Signal.update.bind(null, signal)];
}

/**
 * Create And Use Computed Signal
 *
 * @template T
 * @param {Getter<T>} getter
 * @param {Pick<TrackScopeObserver<T>, 'onTrack'|'onTrigger'>} options
 * @returns {ComputedSignalImpl<T>}
 */
export function useComputedSignal(
  getter,
  { onTrack = null, onTrigger = null } = {}
) {
  assertIsNotInWatchingScope(`define computed signal`);
  if (!isGetter(getter)) {
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

/**
 * Start To Carry A Signal
 *
 * @template {Record<string, any>} T
 * @param {T} target
 * @param {SignalImpl<T|any>} signal
 * @returns {()=>boolean} stop
 */
export function carrySignal(target, signal) {
  if (!isPlainObject(target)) {
    throw new Error("signal carrier must be a plain object");
  }
  if (CONTEXT.isSignalCarrier(target)) return () => false;
  if (isTrueSignal(signal)) {
    CONTEXT.startToCarrySignal(target, signal);
    return () => CONTEXT.stopToCarrySignal(target);
  }
  return () => false;
}

/* ******************* *
 *        调整组        *
 * ******************* *
 */

/**
 * Protect Signal
 *
 * @param {SignalImpl} signal
 */
export function protectSignal(signal) {
  assertIsNotInWatchingScope(`modidy signal properties`);
  if (isTrueSignal(signal)) {
    return (signal[IsProtectedSignal] = true);
  }
  throw new Error("signal carrier must be a plain object");
}

/* ******************* *
 *        收发组        *
 * ******************* *
 */

/**
 * Track Signal
 *
 * @template T
 * @param {SignalImpl<T> | MutableSignalCarrierImpl<T>} target
 * @param {(payload: TrackEffectPayload<T>)=>void} effect
 * @returns {()=>boolean} stop
 */
export function trackSignal(target, effect) {
  try {
    assertIsNotInWatchingScope(`subscribe signal`);
  } catch (error) {
    if (!error?.cause?.isTrackingSignal) throw error;
  }
  if (!isRunInEffectFreeScope() && isFunction(effect)) {
    const signal = CONTEXT.captureSignal(target);
    return signal[SignalSource].subscribe((payload) =>
      effect({ ...payload, shouldBeRetrack: CONTEXT.RETRACKFLAG })
    );
  }
  return () => {};
}

/**
 * Emit Signal
 *
 * @template T
 * @param {SignalImpl<T> | MutableSignalCarrierImpl<T>} target
 * @param {{value: T} & UpdateSignalValueOptions} payload
 * @returns {boolean}
 */
export function emitSignal(target, payload) {
  const signal = CONTEXT.captureSignal(target);
  if (!signal?.[IsProtectedSignal] && signal?.[SignalSource]) {
    Signal.update(signal, payload.value, payload);
    return true;
  }
  return false;
}

/**
 * Interpret Signal
 *
 * @template T
 * @param {SignalImpl<T> | MutableSignalCarrierImpl<T>} target
 * @param {boolean} slient
 * @returns {T | void}
 */
export function interpretSignal(target, slient = false) {
  const signal = CONTEXT.captureSignal(target);
  if (slient) return signal?.[SignalSource].get();
  return signal?.();
}

/* ******************* *
 *        观察组        *
 * ******************* *
 */

/**
 * Watch Signals
 *
 * @template {WatchSource} T
 * @param {Readonly<T>} source
 * @param {(values: WatchValues<T>, oldValues: WatchValues<T>)=>void} callback
 * @param {WatchOptions} options
 * @returns {WatchHandle}
 */
export function watchSignals(
  source,
  callback,
  { immediate = false, once = false, onTrack = null, onTrigger = null } = {}
) {
  assertIsNotInWatchingScope(`watch signal`);
  if (isFunction(callback) === false) {
    console.warn("watch callback must be a function");
    return TrackingScope.emptyWatchHandle;
  }
  if (isRunInEffectFreeScope()) return TrackingScope.emptyWatchHandle;
  const isArrSrc = isArray(source);
  source = isSignal(source)
    ? [CONTEXT.captureSignal(source)]
    : isGetter(source)
    ? [useComputedSignal(source)]
    : isArrSrc
    ? source.map((s) =>
        isSignal(s)
          ? CONTEXT.captureSignal(s)
          : isGetter(s)
          ? useComputedSignal(s)
          : s
      )
    : [];
  if (source.length === 0) return TrackingScope.emptyWatchHandle;
  const effect = () => {
    const oldValues = [];
    const values = source?.map((signal) => {
      if (isSignal(signal)) {
        oldValues.push(signal[PreviousPayload].value);
        return signal[SignalPayload].value;
      }
      oldValues.push(signal);
      return signal;
    });
    if (isArrSrc) callback?.(values, oldValues);
    else callback?.(values[0], oldValues[0]);
    if (once) CONTEXT.getTopWatchingScope()?.stop();
  };
  const scope = new WatchingScope(effect, { onTrack, onTrigger });
  scope.run(() => source.forEach((signal) => interpretSignal(signal)));
  scope.canTrack = (signal) => false;
  if (immediate) scope.runEffect();
  return scope.exposeHanlde(() => ((source = null), (callback = null)));
}

/**
 * Watch Effect
 *
 * @param {ParamlessFunction} effect
 * @param {Pick<TrackScopeObserver<T>, 'onTrack'|'onTrigger'>} options
 * @returns {WatchHandle}
 */
export function watchEffect(effect, { onTrack = null, onTrigger = null } = {}) {
  assertIsNotInWatchingScope(`watch effect`);
  if (isRunInEffectFreeScope()) return TrackingScope.emptyWatchHandle;
  return new WatchingScope(effect, { onTrack, onTrigger })
    .runEffect()
    .exposeHanlde();
}
