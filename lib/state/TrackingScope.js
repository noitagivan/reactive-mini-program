import { debounceMicrotask, EventBus } from "../utils/index";
import { subscribeStateOfSignal } from "./signal";

export default class TrackingScope extends EventBus {
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
  trackedSignals = new Map();

  get isRunning() {
    return this.#isRunning;
  }
  get isTrackingSignal() {
    return this.#isTrackingSignal;
  }

  constructor({ onTrigger, onTrack, onResult, onEffect, isSync = false } = {}) {
    super();
    this.on("trigger", onTrigger);
    this.on("track", onTrack);
    this.on("result", onResult);
    this.on("effect", onEffect);
    if (isSync) {
      this.#isSync = true;
      this.effect = this.effect.bind(this);
    } else {
      this.effect = debounceMicrotask(this.effect.bind(this));
    }
  }
  exposeHanlde() {
    const stop = this.stop.bind(this);
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
  run(fn, { signals, setScope, resetScope }) {
    try {
      this.emit("trigger", { signals });
      setScope(this);
      this.#isRunning = true;
      const result = fn();
      this.#isRunning = true;
      resetScope(this);
      this.emit("result", result);
      return result;
    } catch (error) {
      resetScope(this);
      throw error;
    }
  }
  onDispose(cb) {
    this.on("dispose", cb);
  }
  offDispose(cb) {
    this.off("dispose", cb);
  }
  track({ signal, value }) {
    const { trackedSignals } = this;
    if (this.canTrack(signal)) {
      this.#isTrackingSignal = true;
      trackedSignals.set(signal, subscribeStateOfSignal(signal, this.effect));
      this.#isTrackingSignal = false;
    }
    this.emit("track", { signal, value });
  }
  effect({ signal, value }) {
    if (this.#paused) return;
    this.#isOccurringEffect = true;
    this.emit("effect", { signal, value });
    this.#isOccurringEffect = true;
  }
  pause() {
    this.#paused = true;
  }
  resume() {
    this.#paused = false;
  }
  stop() {
    const { trackedSignals } = this;
    if (trackedSignals.size) {
      Array.from(trackedSignals.values()).forEach((cb) => cb());
      trackedSignals.clear();
    }
    this.clear();
  }
}
