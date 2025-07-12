import { EventBus, isFunction } from "../utils/index";

export default class State {
  #value = undefined;
  #watchable = false;
  #eventBus = new EventBus();

  constructor(value, { watchable, ...hooks }) {
    this.#value = value;
    this.#watchable = watchable;
    this.#eventBus.on("getstate", hooks.onGet);
    this.#eventBus.on("beforesetstate", hooks.onBeforeSet);
    this.#eventBus.on("aftersetstate", hooks.onAfterSet);
    this.#eventBus.on("beforesubscribe", hooks.onBeforeSubscribe);
    this.#eventBus.on("aftersubscribe", hooks.onAfterSubscribe);
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
  subscribe(cb) {
    if (this.#watchable) {
      const payload = {
        callback: cb,
      };
      this.#eventBus?.emit("beforesubscribe", payload);
      if (isFunction(payload.callback)) {
        const unsubscribe = this.#eventBus.on("setstate", (e) =>
          payload.callback(e.payload)
        );
        this.#eventBus?.emit("aftersubscribe", unsubscribe);
        return unsubscribe;
      }
    }
    return () => {};
  }
}
