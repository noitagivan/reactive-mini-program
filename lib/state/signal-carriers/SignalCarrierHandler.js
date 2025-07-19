import { hasOwnProp } from "../../utils/index";

export class SignalCarrierHandler {
  __signal = null;
  __visitors = null;
  __emit = null;

  constructor({ signal, visitors, emit }) {
    this.__signal = signal;
    this.__visitors = visitors || {};
    this.__emit = emit;
  }
  get(t, p, r) {
    if (hasOwnProp(t, p)) {
      const value = this.__signal()[p];
      return this.__visitors?.Reading?.([p, value]) || value;
    }
    return t[p];
  }
  set(t, p, v, r) {
    return false;
  }
  deleteProperty(t, p, r) {
    return false;
  }
}

export class MutableSignalCarrierHandler extends SignalCarrierHandler {
  set(t, p, v, r) {
    return this.__visitors?.Assignment?.([p, v]) ? this.__emit() : false;
  }
}

export class NestedSignalCarrierHandler extends SignalCarrierHandler {
  set(t, p, v, r) {
    if (v === t[p]) return false;
    const untracked = hasOwnProp(t, p)
      ? this.__visitors?.Replacement?.([p, t[p]])
      : false;
    t[p] = this.__visitors?.Assignment?.([p, v]) || v;
    return this.__emit(untracked);
  }
  deleteProperty(t, p, r) {
    if (hasOwnProp(t, p)) {
      this.__visitors?.Deletion?.([p, t[p]]);
      delete t[p];
      return this.__emit(true);
    }
    return true;
  }
}
