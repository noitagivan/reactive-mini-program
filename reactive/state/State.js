import { mergeCallbacks } from "../utils/index";

export default class State {
  _value = undefined;
  _watchers = null;

  constructor(
    value,
    {
      watchable,
      onRead,
      onBeforeWrite,
      onAfterWrite,
      onBeforeSubscribe,
      onAfterSubscribe,
    }
  ) {
    this._value = value;
    this._hooks = {
      onRead,
      onBeforeWrite,
      onAfterWrite,
      onBeforeSubscribe,
      onAfterSubscribe,
    };
    if (watchable) {
      this._watchers = new Set();
    }
  }

  get value() {
    const evt = { type: "read", value: this._value };
    this._hooks?.onRead?.({ type: "read", value: this._value });
    return evt.value;
  }
  set value(newValue) {
    const { _value: oldValue, _watchers: watchers } = this;
    const evt = { type: "beforewrite", value: this._value, newValue };
    this._hooks?.onBeforeWrite?.(evt);

    if (evt.newValue !== oldValue) {
      this._value = evt.newValue;
      if (watchers?.size) {
        mergeCallbacks(Array.from(watchers.values()), null, {
          value: this._value,
          oldValue,
        })();
      }
      this._hooks?.onBeforeWrite?.({
        type: "afterwrite",
        value: this._value,
        oldValue,
      });
    }
    return true;
  }
  subscribe(cb) {
    const { _watchers: watchers } = this;
    if (watchers) {
      const evt = {
        type: "beforesubscribe",
        callback: cb,
      };
      this._hooks?.onBeforeSubscribe?.(evt);
      const unsubscribe = () => watchers.delete(evt.callback);
      watchers.add(evt.callback);
      this._hooks?.onAfterSubscribe?.({
        type: "aftersubscribe",
        unsubscribe,
      });
      return unsubscribe;
    }
    return () => {};
  }
}
