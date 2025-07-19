import { carrySignal, protectSignal, trackSignal } from "../signal";

export default class CarrierRuntimeContext {
  CAN_CONSTRUCT = false;

  #CARRIER_META_MAP = new WeakMap();
  isInternalSignalCarrier(carrier) {
    return this.#CARRIER_META_MAP.has(carrier);
  }
  getSignalCarrierMeta(carrier) {
    return this.#CARRIER_META_MAP.get(carrier);
  }
  setSignalCarrierMeta(carrier, meta) {
    return this.#CARRIER_META_MAP.set(carrier, meta);
  }

  #TARGET_CARRIER_MAP = new WeakMap();
  isTargetOfCarrier(target) {
    return this.#TARGET_CARRIER_MAP.has(target);
  }
  getCarrierByTarget(target) {
    return this.#TARGET_CARRIER_MAP.get(target);
  }
  mapTargetToCarrier(target, carrier) {
    return this.#TARGET_CARRIER_MAP.set(target, carrier);
  }

  store(target, description) {
    const { carrier, ...meta } = description;
    protectSignal(meta.signal);
    carrySignal(carrier, meta.signal);
    this.setSignalCarrierMeta(carrier, meta);
    if (target) this.mapTargetToCarrier(target, carrier);
  }
  restore(targetOrCarrier) {
    const signal = this.isInternalSignalCarrier(targetOrCarrier)
      ? targetOrCarrier
      : this.getCarrierByTarget(targetOrCarrier) || null;
    return signal ? { ...this.getSignalCarrierMeta(signal), signal } : {};
  }
  trackCarrierProp(t, emt, p, sp) {
    const { trackings } = this.restore(t);
    trackings?.get(p)?.();
    trackings?.set(p, trackSignal(s, emt));
    return sp;
  }
  removeCarrierProp(t, [p, v]) {
    if (this.isTargetOfCarrier(v)) {
      const { trackings } = this.restore(t);
      trackings.get(p)?.();
      trackings.delete(p);
      return true;
    }
    return false;
  }
}
