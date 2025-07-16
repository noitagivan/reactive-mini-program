import { mapToSignal, protectSignal, trackSignal } from "../signal";

export default class ObjectiveSignalContext {
  CAN_CONSTRUCT = false;

  #OBJ_SIGNALS = new WeakMap();
  isObjectiveSignal(signal) {
    return this.#OBJ_SIGNALS.has(signal);
  }
  getObjectSignalMeta(obj_signal) {
    return this.#OBJ_SIGNALS.get(obj_signal);
  }
  setObjectSignalMeta(obj_signal, meta) {
    return this.#OBJ_SIGNALS.set(obj_signal, meta);
  }

  #TARGET_SIGNAL_MAP = new WeakMap();
  isTargetOfObjectSignal(target) {
    return this.#TARGET_SIGNAL_MAP.has(target);
  }
  getObjectSignalByTarget(target) {
    return this.#TARGET_SIGNAL_MAP.get(target);
  }
  mapTargetToObjectSignal(target, obj_signal) {
    return this.#TARGET_SIGNAL_MAP.set(target, obj_signal);
  }
  store(target, description) {
    const { obj_signal, ...meta } = description;
    protectSignal(meta.func_signal);
    mapToSignal(obj_signal, meta.func_signal);
    this.setObjectSignalMeta(obj_signal, meta);
    if (target) this.mapTargetToObjectSignal(target, obj_signal);
  }
  restore(target) {
    const signal = this.isObjectiveSignal(target)
      ? target
      : this.getObjectSignalByTarget(target) || null;
    return signal ? { ...this.getObjectSignalMeta(signal), signal } : {};
  }
  trackSignalProp(t, e, p, s) {
    const { trackings } = this.restore(t);
    trackings?.get(p)?.();
    trackings?.set(p, trackSignal(s, e));
    return s;
  }
  removeProp(t, [p, v]) {
    if (this.isTargetOfObjectSignal(v)) {
      const { trackings } = this.restore(t);
      trackings.get(p)?.();
      trackings.delete(p);
      return true;
    }
    return false;
  }
}
