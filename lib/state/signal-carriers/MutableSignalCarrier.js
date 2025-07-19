import { SignalCarrier, useSignalCarrier } from "./carriers";

class MutableSignalCarrier extends SignalCarrier {
  constructor(target) {
    super(target, true);
  }
}

/**
 * @template {Record<string, any>} T
 * @param {T} target
 * @returns {MutableSignalCarrierImpl<T>}
 */
export default function useMutableSignalCarrier(target) {
  return useSignalCarrier(target, MutableSignalCarrier);
}
