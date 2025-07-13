import { EventBus, isFunction } from "../utils/index";

export default class State {
  #value = undefined;
  #watchable = false;
  #eventBus = new EventBus();

  constructor(value, { watchable, onGet, onBeforeSet, onAfterSet }) {
    this.#value = value;
    this.#watchable = watchable;
    this.#eventBus.on("getstate", onGet);
    this.#eventBus.on("beforesetstate", onBeforeSet);
    this.#eventBus.on("aftersetstate", onAfterSet);
  }

  get $value$() {
    return this.#value;
  }

  get value() {
    const payload = { value: this.#value };
    this.#eventBus?.emit("getstate", payload);
    return payload.value;
  }
  set value(newValue) {
    const oldValue = this.#value;
    const watchable = this.#watchable;
    const payload = { value: oldValue, newValue };
    this.#eventBus?.emit("beforesetstate", payload);

    if (payload.newValue !== oldValue) {
      this.#value = payload.newValue;
      if (watchable) {
        this.#eventBus?.emit("setstate", {
          value: this.#value,
          oldValue,
        });
      }
      this.#eventBus?.emit("aftersetstate", {
        value: this.#value,
        oldValue,
      });
    }
    return true;
  }

  subscribe(onSet) {
    if (this.#watchable && isFunction(onSet)) {
      return this.#eventBus.on("setstate", (e) => onSet(e.payload));
    }
    return () => {};
  }
}
