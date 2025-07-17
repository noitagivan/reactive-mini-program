import { debounceMicrotask, EventBus } from "../utils/index";
import { trackSignal } from "./signal";
import { onScopeDispose } from "./EffectScope";

export default class extends EventBus {
  static get emptyWatchHandle() {
    const stop = () => {};
    stop.pause = () => {};
    stop.resume = () => {};
    stop.stop = stop;
    return Object.freeze(stop);
  }

  #isRunning = false;
  #isSync = false;
  #isOccurringEffect = false;
  #paused = false;
  #isTrackingSignal = false;
  trackedSignals = new WeakMap();

  get isSync() {
    return this.#isSync;
  }
  get isRunning() {
    return this.#isRunning;
  }
  get isOccurringEffect() {
    return this.#isOccurringEffect;
  }
  get isTrackingSignal() {
    return this.#isTrackingSignal;
  }

  constructor({ onTrigger, onTrack, onResult, isSync = false } = {}) {
    super();
    this.on("track", onTrack);
    this.on("result", onResult);
    this.triggerEffect = this.triggerEffect.bind(this);
    if (isSync) {
      this.#isSync = true;
    } else {
      this.triggerEffect = debounceMicrotask(this.triggerEffect, onTrigger);
    }
    onScopeDispose(this.stop.bind(this));
  }
  triggerEffect({ shouldBeRetrack }) {
    if (this.#paused) return;
    this.#isOccurringEffect = true;
    if (shouldBeRetrack) console.log("shouldBeRetrack");
    if (shouldBeRetrack) this.unTrackAll();
    this.emit("effect");
    this.#isOccurringEffect = true;
  }
  exposeHanlde(onAfterStop) {
    const stop = () => (this.stop(), onAfterStop?.(), void 0);
    stop.pause = this.pause.bind(this);
    stop.resume = this.resume.bind(this);
    stop.stop = stop;
    return Object.freeze(stop);
  }
  hasTracked(signal) {
    return this.trackedSignals.has(signal);
  }
  canTrack(signal) {
    return this.hasTracked(signal) === false;
  }
  run(fn, { setScope, resetScope } = {}) {
    try {
      setScope?.(this);
      this.#isRunning = true;
      const result = fn();
      this.#isRunning = true;
      resetScope?.(this);
      this.emit("result", result);
      return result;
    } catch (error) {
      resetScope?.(this);
      throw error;
    }
  }
  track({ signal, value }) {
    const { trackedSignals } = this;
    if (this.canTrack(signal)) {
      this.#isTrackingSignal = true;
      trackedSignals.set(signal, trackSignal(signal, this.triggerEffect));
      this.#isTrackingSignal = false;
    }
    this.emit("track", { signal, value });
  }
  unTrackAll() {
    const { trackedSignals } = this;
    if (trackedSignals.size) {
      Array.from(trackedSignals.values()).forEach((untrack) => untrack());
      trackedSignals.clear();
    }
  }
  pause() {
    this.#paused = true;
  }
  resume() {
    this.#paused = false;
  }
  stop() {
    this.unTrackAll();
    this.clear();
  }
}
