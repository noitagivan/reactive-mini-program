import { hasOwnProp } from "../../utils/index";

export class SignalizedObjectHandler {
  __func_signal = null;
  __visitors = null;
  __emit = null;

  constructor({ func_signal, visitors, emit }) {
    this.__func_signal = func_signal;
    this.__visitors = visitors || {};
    this.__emit = emit;
  }
  get(t, p, r) {
    if (hasOwnProp(t, p)) {
      const value = this.__func_signal()[p];
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

export class MutableSignalizedObjectHandler extends SignalizedObjectHandler {
  set(t, p, v, r) {
    return this.__visitors?.Assignment?.([p, v]) ? this.__emit() : false;
  }
}

export class NestedSignalizedObjectHandler extends SignalizedObjectHandler {
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
