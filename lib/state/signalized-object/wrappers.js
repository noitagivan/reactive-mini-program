import { hasOwnProp, isNonNullObject, isPlainObject } from "../../utils/index";
import { isWatchable, useSignal } from "../signal";
import SignalizationContext from "./SignalizationContext";
import {
  MutableSignalizedObjectHandler,
  NestedSignalizedObjectHandler,
  SignalizedObjectHandler,
} from "./SignalizedObjectHandler";

const CONTEXT = new SignalizationContext();
const IsConstructor = Symbol("IsSignalizedObjectConstructor");
const AssignProperty = Symbol("AssignSignalizedObjectProperty");

export class SignalizedObject {
  static [IsConstructor](type) {
    return (
      type === SignalizedObject || type.prototype instanceof SignalizedObject
    );
  }
  static [AssignProperty]([p, v]) {
    if (!hasOwnProp(this, p) || v === this[p]) return false;
    this[p] = v;
    return true;
  }
  constructor(target, mutable = false) {
    if (!CONTEXT.CAN_CONSTRUCT) {
      throw new Error(
        "cannot instantiate an SignalizedObject using the new expression directly. Please instead of using the useSignalizedObject function to instantiate it."
      );
    }
    if (!isPlainObject(target))
      throw new Error("object signal target must be a non-null-object");

    Object.assign(this, target);
    const [func_signal, emit_func_signal] = useSignal({ ...this });
    const emit = () => emit_func_signal({ ...this });
    const Assignment = SignalizedObject[AssignProperty].bind(this);
    const assign = (source) => {
      if (isPlainObject(source)) {
        Object.entries(source).forEach(Assignment);
        return emit();
      }
    };

    const handler = mutable
      ? new MutableSignalizedObjectHandler({
          func_signal,
          visitors: { Assignment },
          emit,
        })
      : new SignalizedObjectHandler({ func_signal });
    const obj_signal = new Proxy(this, handler);
    CONTEXT.store(this, { obj_signal, func_signal, assign });
  }
}
export function isSignalizedObject(signal) {
  return CONTEXT.isSignalizedObject(signal);
}
export function useSignalizedObject(target, type = SignalizedObject) {
  if (SignalizedObject[IsConstructor](type)) {
    CONTEXT.CAN_CONSTRUCT = true;
    const instance = new type(target);
    CONTEXT.CAN_CONSTRUCT = false;
    const { signal, assign } = CONTEXT.restore(instance);
    return [signal, assign];
  }
  throw new Error("type must be an SignalizedObjectConstructor");
}

function wrapNestedSignal(target) {
  const existsSignal = CONTEXT.getSignalizedObjectByTarget(target);
  if (existsSignal) return existsSignal;

  const [func_signal, emit_func_signal] = useSignal(target);
  const emit = (shouldBeRetrack) =>
    emit_func_signal(target, { forced: true, shouldBeRetrack });
  const track = CONTEXT.trackSignalProp.bind(CONTEXT, target, () => emit());
  const DeletionOrReplacement = CONTEXT.removeProp.bind(CONTEXT, target);

  const visitors = {
    Reading: ([p, v]) =>
      isNonNullObject(v) && !isWatchable(v) ? track(p, wrapNestedSignal(v)) : v,
    Assignment: ([p, v]) => (isWatchable(v) ? track(p, v) : v),
    Replacement: DeletionOrReplacement,
    Deletion: DeletionOrReplacement,
  };

  const obj_signal = new Proxy(
    target,
    new NestedSignalizedObjectHandler({ func_signal, visitors, emit })
  );
  CONTEXT.store(target, { obj_signal, func_signal, trackings: new Map() });
  Object.entries(target).forEach(visitors.Assignment);
  return obj_signal;
}
export function reactive(target) {
  if (!isPlainObject(target)) {
    throw new Error("object signal target must be a non-null-object");
  }
  return wrapNestedSignal(target);
}

class ValueRefSignal {
  constructor(value) {
    const [func_signal, emit_func_signal] = useSignal(value);
    CONTEXT.store(null, {
      func_signal,
      emit_func_signal,
      value,
      obj_signal: this,
      isValueRef: true,
      trackings: new Map(),
    });
  }
  get value() {
    const meta = CONTEXT.getSignalizedObjectMeta(this);
    const value = meta.func_signal();
    if (isNonNullObject(value) && !isWatchable(value)) {
      return CONTEXT.trackSignalProp(
        this,
        () => meta.emit_func_signal(value, { forced: true }),
        "value",
        wrapNestedSignal(value)
      );
    }
    return value;
  }
  set value(newValue) {
    const meta = CONTEXT.getSignalizedObjectMeta(this);
    if (newValue !== meta.value) {
      const untracked = CONTEXT.removeProp(this, ["value", meta.value]);
      meta.value = newValue;
      return meta.emit_func_signal(newValue, {
        forced: true,
        untracked,
      });
    }
    return false;
  }
}
export function isValueRefSignal(ref) {
  return ref instanceof ValueRefSignal;
}
export function ref(value) {
  return new ValueRefSignal(value);
}
