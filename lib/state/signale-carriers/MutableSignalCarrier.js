import { SignalCarrier, useSignalCarrier } from "./carriers";

class MutableSignalCarrier extends SignalCarrier {
  constructor(target) {
    super(target, true);
  }
}

export default function useMutableSignalCarrier(target) {
  return useSignalCarrier(target, MutableSignalCarrier);
}
