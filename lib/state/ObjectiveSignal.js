import { isNonNullObject, isPlainObject } from "../utils/index";
// import { protectedSignal, mapToSignal } from "./signal";

import { mapToSignal, protectSignal, useSignal } from "./signal";

function createProtectedSignal(value) {
  const [signal, emitter] = useSignal(value);
  protectSignal(signal);
  return [signal, emitter];
}

class ObjectiveSignal {
  #getter = null;
  #setter = null;
  constructor(target) {
    if (!isPlainObject(target)) {
      throw new Error("object signal target must be a non-null-object");
    }
    const [getter, setter] = createProtectedSignal(target);
    Object.assign(this, target);
    this.#setter = setter;
    this.#getter = getter;
    mapToSignal(this, getter);
  }
}
// class NestedObjectSignal extends ObjectiveSignal {}
// class ValueRefSignal extends NestedObjectSignal {}

export const isObjectiveSignal = (signal) =>
  isNonNullObject(signal) && signal instanceof ObjectiveSignal;
// export const isNestedObjectSignal = (signal) =>
//   isNonNullObject(signal) && signal instanceof NestedObjectSignal;
// export const isValueRefSignal = (signal) =>
//   isNonNullObject(signal) && signal instanceof ValueRefSignal;

// /**
//  * TODO
//  * 需要实现深度观察
//  */
// const createNestedObjectSignal = (target, setParent) => {
//   const object = new NestedObjectSignal(target);
//   const [getter, setter] = protectedSignal(target);
//   const signal = new Proxy(object, {
//     get: (t, p, r) => getter()[p],
//     set: (t, p, v, r) => ((target[p] = v), setter(object)),
//     deleteProperty: (t, p) => false,
//   });
//   mapToSignal(signal, getter);
//   return signal;
// };

export function objective(target) {
  if (!isPlainObject(target)) {
    throw new Error("object signal target must be a non-null-object");
  }
  const object = new ObjectiveSignal(target);
  const [getter, setter] = createProtectedSignal(object);
  const signal = new Proxy(object, {
    get: (t, p, r) => getter()[p],
    set: (t, p, v, r) => false,
    deleteProperty: (t, p) => false,
  });
  mapToSignal(signal, getter);
  return [signal, getter, setter];
}

// export function reactive(target) {
//   if (!isPlainObject(target)) {
//     throw new Error("object signal target must be a non-null-object");
//   }
//   return createNestedObjectSignal(target, null);
// }

// /**
//  * TODO
//  * 需要确定 vue ref 的可读写性
//  */
// export function ref(value) {
//   const object = new ValueRefSignal({ value });
//   const [getter, setter] = protectedSignal(object);
//   const signal = new Proxy(object, {
//     get: (t, p, r) => {
//       if (p === "value") {
//         return getter().value;
//       }
//       return undefined;
//     },
//     set: (t, p, value, r) => {
//       if (p === "value") {
//         setter({ value });
//         return true;
//       }
//       return false;
//     },
//     deleteProperty: (t, p) => false,
//   });
//   mapToSignal(signal, getter);
//   return signal;
// }
