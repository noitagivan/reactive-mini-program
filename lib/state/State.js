import { EventBus, isFunction } from "../utils/index";

export default class State {
  #value = undefined;
  #watchable = false;
  #eventBus = new EventBus();

  constructor(value, { watchable, onGet, onBeforeSet, onAfterSet }) {
    this.#value = value;
    if (watchable) {
      this.#watchable = watchable;
      this.#eventBus.on("getstate", onGet);
      this.#eventBus.on("beforesetstate", onBeforeSet);
      this.#eventBus.on("aftersetstate", onAfterSet);
    }
  }

  get watchable() {
    return this.#watchable;
  }

  get value() {
    const payload = { value: this.#value };
    if (this.#watchable) {
      this.#eventBus?.emit("getstate", payload);
    }
    return payload.value;
  }
  set value(newValue) {
    return this.set(newValue);
  }

  get() {
    return this.#value;
  }
  set(newValue, forced = false) {
    const oldValue = this.#value;
    if (this.#watchable) {
      const payload = { value: oldValue, newValue };
      this.#eventBus?.emit("beforesetstate", payload);

      if (forced || payload.newValue !== oldValue) {
        this.#value = payload.newValue;
        this.#eventBus?.emit("setstate", { value: this.#value, oldValue });
        this.#eventBus?.emit("aftersetstate", { value: this.#value, oldValue });
        return true;
      }
      return false;
    } else {
      this.#value = newValue;
      return true;
    }
  }

  subscribe(onSet) {
    if (this.#watchable && isFunction(onSet)) {
      return this.#eventBus.on("setstate", (e) => onSet(e.payload));
    }
    return () => {};
  }

  clearSubscriptions() {
    this.#eventBus.off("setstate");
  }

  freeze() {
    this.#eventBus.clear();
    this.#eventBus = null;
    this.#watchable = false;
    Object.freeze(this);
  }
}
