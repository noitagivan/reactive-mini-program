import { mapToSignal, protectSignal, trackSignal } from "../signal";

export default class SignalizationContext {
  CAN_CONSTRUCT = false;

  #OBJ_SIGNALS = new WeakMap();
  isSignalizedObject(signal) {
    return this.#OBJ_SIGNALS.has(signal);
  }
  getSignalizedObjectMeta(obj_signal) {
    return this.#OBJ_SIGNALS.get(obj_signal);
  }
  setSignalizedObjectMeta(obj_signal, meta) {
    return this.#OBJ_SIGNALS.set(obj_signal, meta);
  }

  #TARGET_SIGNAL_MAP = new WeakMap();
  isTargetOfSignalizedObject(target) {
    return this.#TARGET_SIGNAL_MAP.has(target);
  }
  getSignalizedObjectByTarget(target) {
    return this.#TARGET_SIGNAL_MAP.get(target);
  }
  mapTargetToSignalizedObject(target, obj_signal) {
    return this.#TARGET_SIGNAL_MAP.set(target, obj_signal);
  }
  store(target, description) {
    const { obj_signal, ...meta } = description;
    protectSignal(meta.func_signal);
    mapToSignal(obj_signal, meta.func_signal);
    this.setSignalizedObjectMeta(obj_signal, meta);
    if (target) this.mapTargetToSignalizedObject(target, obj_signal);
  }
  restore(signalOrTarget) {
    const signal = this.isSignalizedObject(signalOrTarget)
      ? signalOrTarget
      : this.getSignalizedObjectByTarget(signalOrTarget) || null;
    return signal ? { ...this.getSignalizedObjectMeta(signal), signal } : {};
  }
  trackSignalProp(t, emt, p, sp) {
    const { trackings } = this.restore(t);
    trackings?.get(p)?.();
    trackings?.set(p, trackSignal(s, emt));
    return sp;
  }
  removeProp(t, [p, v]) {
    if (this.isTargetOfSignalizedObject(v)) {
      const { trackings } = this.restore(t);
      trackings.get(p)?.();
      trackings.delete(p);
      return true;
    }
    return false;
  }
}
