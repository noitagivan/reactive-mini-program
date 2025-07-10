import { isNonNullObject, isPlainObject } from "../utils/index";
import { protectedSignal, ref2Signal } from "./signal";

class ObjectSignal {
  constructor(target) {
    Object.assign(this, target);
  }
}
class ProtectedObjectSignal extends ObjectSignal {}
class NestedObjectSignal extends ObjectSignal {}
class ValueRefSignal extends NestedObjectSignal {}

export const isObjectSignal = (siganl) =>
  isNonNullObject(siganl) && siganl instanceof ObjectSignal;
export const isNestedObjectSignal = (siganl) =>
  isNonNullObject(siganl) && siganl instanceof NestedObjectSignal;
export const isValueRefSignal = (siganl) =>
  isNonNullObject(siganl) && siganl instanceof ValueRefSignal;

/**
 * TODO
 * 需要实现深度观察
 */
const createNestedObjectSignal = (target, setParent) => {
  const object = new NestedObjectSignal(target);
  const [getter, setter] = protectedSignal(target);
  const signal = new Proxy(object, {
    get: (t, p, r) => getter()[p],
    set: (t, p, v, r) => ((target[p] = v), setter(object)),
    deleteProperty: (t, p) => false,
  });
  ref2Signal(signal, getter);
  return signal;
};

export function protectedObjectSignal(target) {
  if (!isPlainObject(target)) {
    throw new Error("object signal target must be a non-null-object");
  }
  const object = new ProtectedObjectSignal(target);
  const [getter, setter] = protectedSignal(object);
  const signal = new Proxy(object, {
    get: (t, p, r) => getter()[p],
    set: (t, p, v, r) => false,
    deleteProperty: (t, p) => false,
  });
  ref2Signal(signal, getter);
  return [signal, getter, setter];
}

export function nestedObjectSignal(target) {
  if (!isPlainObject(target)) {
    throw new Error("object signal target must be a non-null-object");
  }
  return createNestedObjectSignal(target, null);
}

/**
 * TODO
 * 需要确定 vue ref 的可读写性
 */
export function valueRefSignal(value) {
  const object = new ValueRefSignal({ value });
  const [getter, setter] = protectedSignal(object);
  const signal = new Proxy(object, {
    get: (t, p, r) => {
      if (p === "value") {
        return getter().value;
      }
      return undefined;
    },
    set: (t, p, value, r) => {
      if (p === "value") {
        setter({ value });
        return true;
      }
      return false;
    },
    deleteProperty: (t, p) => false,
  });
  ref2Signal(signal, getter);
  return signal;
}
