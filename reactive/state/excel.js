import { isPlainObject } from "../utils/index";
import { protect, ref as refSignal } from "./signals";

class ObjectSignal {
  constructor(target) {
    Object.assign(this, target);
  }
}
class ProtectedObjectSignal extends ObjectSignal {}
class NestedObjectSignal extends ObjectSignal {}
class ValueRef extends NestedObjectSignal {}

export function protectedObject(target) {
  if (!isPlainObject(target)) {
    throw new Error("object signal target must be a non-null-object");
  }
  const object = new ProtectedObjectSignal(target);
  const [getter, setter] = protect(object);
  const signal = new Proxy(object, {
    get: (t, p, r) => getter()[p],
    set: (t, p, v, r) => false,
    deleteProperty: (t, p) => false,
  });
  refSignal(signal, getter);
  return [signal, getter, setter];
}

export function reactive(target) {
  if (!isPlainObject(target)) {
    throw new Error("object signal target must be a non-null-object");
  }
  const object = new NestedObjectSignal(target);
  const [getter, setter] = protect(target);
  const signal = new Proxy(object, {
    get: (t, p, r) => getter()[p],
    set: (t, p, v, r) => ((target[p] = v), setter(object)),
    deleteProperty: (t, p) => false,
  });
  refSignal(signal, getter);
  return signal;
}

export function ref(value) {
  const object = new ValueRef({ value });
  const [getter, setter] = protect(object);
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
  refSignal(signal, getter);
  return signal;
}
