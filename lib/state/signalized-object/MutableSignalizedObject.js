import { SignalizedObject, useSignalizedObject } from "./wrappers";

class MutableSignalizedObject extends SignalizedObject {
  constructor(target) {
    super(target, true);
  }
}

export default function useMutableSignalizedObject(target) {
  return useSignalizedObject(target, MutableSignalizedObject);
}
