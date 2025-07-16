import { ObjectiveSignal, useObjectiveSignal } from "./wrappers";

class MutableObjectiveSignal extends ObjectiveSignal {
  constructor(target) {
    super(target, true);
  }
}

export default function useMutableSignal(target) {
  return useObjectiveSignal(target, MutableObjectiveSignal);
}
