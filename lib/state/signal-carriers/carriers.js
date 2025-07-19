import { hasOwnProp, isNonNullObject, isPlainObject } from "../../utils/index";
import { interpretSignal, isSignal, isWatchable, useSignal } from "../signal";
import RuntimeContext from "./CarrierRuntimeContext";
import {
  MutableSignalCarrierHandler,
  NestedSignalCarrierHandler,
  SignalCarrierHandler,
} from "./SignalCarrierHandler";

const CONTEXT = new RuntimeContext();
const IsConstructor = Symbol("IsSignalCarrierConstructor");
const AssignProperty = Symbol("AssignSignalCarrierProperty");

/**
 * @template {Record<string, any>} T
 */
export class SignalCarrier {
  static [IsConstructor](type) {
    return type === SignalCarrier || type.prototype instanceof SignalCarrier;
  }
  static [AssignProperty]([p, v]) {
    if (!hasOwnProp(this, p) || v === this[p]) return false;
    this[p] = v;
    return true;
  }
  /**
   *
   * @param {T} target
   * @param {boolean} mutable
   */
  constructor(target, mutable = false) {
    if (!CONTEXT.CAN_CONSTRUCT) {
      throw new Error(
        "cannot instantiate an SignalCarrier using the new expression directly. Please instead of using the useSignalCarrier function to instantiate it."
      );
    }
    if (!isPlainObject(target))
      throw new Error("object signal target must be a non-null-object");

    Object.assign(this, target);
    const [signal, emitSignal] = useSignal({ ...this });
    const emit = () => emitSignal({ ...this });
    const Assignment = SignalCarrier[AssignProperty].bind(this);
    const assign = (source) => {
      if (isPlainObject(source)) {
        Object.entries(source).forEach(Assignment);
        return emit();
      }
      return false;
    };

    const handler = mutable
      ? new MutableSignalCarrierHandler({
          signal,
          visitors: {
            Assignment,
            Reading: ([p, v]) => (isSignal(v) ? interpretSignal(v, true) : v),
          },
          emit,
        })
      : new SignalCarrierHandler({ signal });
    const carrier = new Proxy(this, handler);
    CONTEXT.store(this, { carrier, signal, assign });
  }
}

/**
 * @param {any} signal
 * @returns {signal is InternalSignalCarrier}
 */
export function isInternalSignalCarrier(signal) {
  return CONTEXT.isInternalSignalCarrier(signal);
}
/**
 * @template {Record<string, any>} T1
 * @template {SignalCarrier<T1>} T2
 * @param {T1} target
 * @param {typeof T2} type
 * @returns {[ProxyWrapper<SignalCarrier<T1>>, (source: T1)=>boolean]}
 */
export function useSignalCarrier(target, type = SignalCarrier) {
  if (SignalCarrier[IsConstructor](type)) {
    CONTEXT.CAN_CONSTRUCT = true;
    const instance = new type(target);
    CONTEXT.CAN_CONSTRUCT = false;
    const { signal, assign } = CONTEXT.restore(instance);
    return [signal, assign];
  }
  throw new Error("type must be an SignalCarrierConstructor");
}

/**
 * @template {Record<string, any>} T
 * @param {T} target
 * @returns {NestedSignalCarrierImpl<T>}
 */
function wrapNestedCarrier(target) {
  const existsSignal = CONTEXT.getCarrierByTarget(target);
  if (existsSignal) return existsSignal;

  const [signal, emitSignal] = useSignal(target);
  const emit = (shouldBeRetrack) =>
    emitSignal(target, { forced: true, shouldBeRetrack });
  const track = CONTEXT.trackCarrierProp.bind(CONTEXT, target, () => emit());
  const DeletionOrReplacement = CONTEXT.removeCarrierProp.bind(CONTEXT, target);

  const visitors = {
    Assignment: ([p, v]) => (isWatchable(v) ? track(p, v) : v),
    Reading: ([p, v]) =>
      isNonNullObject(v) && !isSignal(v) ? track(p, wrapNestedCarrier(v)) : v,
    Replacement: DeletionOrReplacement,
    Deletion: DeletionOrReplacement,
  };

  const carrier = new Proxy(
    target,
    new NestedSignalCarrierHandler({ signal, visitors, emit })
  );
  CONTEXT.store(target, { carrier, signal, trackings: new Map() });
  Object.entries(target).forEach(visitors.Assignment);
  return carrier;
}

export function reactive(target) {
  if (!isPlainObject(target)) {
    throw new Error("object signal target must be a non-null-object");
  }
  return wrapNestedCarrier(target);
}

/**
 * @template T
 */
class SignalPayloadRef {
  /**
   *
   * @param {T} value
   */
  constructor(value) {
    const [signal, emitSignal] = useSignal(value);
    CONTEXT.store(null, {
      signal,
      emitSignal,
      value,
      carrier: this,
      isValueRef: true,
      trackings: new Map(),
    });
  }
  /**
   * @returns {T}
   */
  get value() {
    const meta = CONTEXT.getSignalCarrierMeta(this);
    const value = meta.signal();
    if (isNonNullObject(value) && !isSignal(value)) {
      return CONTEXT.trackCarrierProp(
        this,
        () => meta.emitSignal(value, { forced: true }),
        "value",
        wrapNestedCarrier(value)
      );
    }
    return value;
  }
  /**
   * @param {T} newValue
   * @returns {boolean}
   */
  set value(newValue) {
    const meta = CONTEXT.getSignalCarrierMeta(this);
    if (newValue !== meta.value) {
      const untracked = CONTEXT.removeCarrierProp(this, ["value", meta.value]);
      meta.value = newValue;
      return meta.emitSignal(newValue, {
        forced: true,
        untracked,
      });
    }
    return false;
  }
}

/**
 * @param {any} ref
 * @returns {ref is  SignalPayloadRefImpl}
 */
export function isSignalPayloadRef(ref) {
  return ref instanceof SignalPayloadRef;
}

/**
 * @template T
 * @param {T} value
 * @returns {SignalPayloadRef<T>}
 */
export function ref(value) {
  return new SignalPayloadRef(value);
}
