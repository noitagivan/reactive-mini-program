import { EventBus, isFunction } from "../utils/index";

export default class State {
  _value = undefined;
  _watchable = false;
  _eventBus = new EventBus();

  constructor(value, { watchable, ...hooks }) {
    this._value = value;
    this._watchable = watchable;
    this._eventBus.on("getstate", hooks.onGet);
    this._eventBus.on("beforesetstate", hooks.onBeforeSet);
    this._eventBus.on("aftersetstate", hooks.onAfterSet);
    this._eventBus.on("beforesubscribe", hooks.onBeforeSubscribe);
    this._eventBus.on("aftersubscribe", hooks.onAfterSubscribe);
  }

  get value() {
    const payload = { value: this._value };
    this._eventBus?.emit("getstate", payload);
    return payload.value;
  }
  set value(newValue) {
    const { _value: oldValue, _watchable } = this;
    const payload = { value: this._value, newValue };
    this._eventBus?.emit("beforesetstate", payload);

    if (payload.newValue !== oldValue) {
      this._value = payload.newValue;
      if (_watchable) {
        this._eventBus?.emit("setstate", {
          value: this._value,
          oldValue,
        });
      }
      this._eventBus?.emit("aftersetstate", {
        value: this._value,
        oldValue,
      });
    }
    return true;
  }
  subscribe(cb) {
    if (this._watchable) {
      const payload = {
        callback: cb,
      };
      this._eventBus?.emit("beforesubscribe", payload);
      if (isFunction(payload.callback)) {
        const unsubscribe = this._eventBus.on("setstate", (e) =>
          payload.callback(e.payload)
        );
        this._eventBus?.emit("aftersubscribe", unsubscribe);
        return unsubscribe;
      }
    }
    return () => {};
  }
}
