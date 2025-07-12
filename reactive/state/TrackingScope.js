import { debounceMicrotask, EventBus } from "../utils/index";
import { subscribeStateOfSignal } from "./signal";

export default class TrackingScope {
  static get emptyWatchHandle() {
    const stop = () => {};
    stop.pause = () => {};
    stop.resume = () => {};
    stop.stop = stop;
    return Object.freeze(stop);
  }

  isRunning = false;
  isTrackingSignal = false;
  isOccurringEffect = false;
  isSync = false;
  paused = false;
  // handlers = {};
  eventBus = new EventBus();
  trackedSignals = new Map();

  constructor({ onTrigger, onTrack, onResult, onEffect, isSync = false } = {}) {
    this.eventBus.on("trigger", onTrigger);
    this.eventBus.on("track", onTrack);
    this.eventBus.on("result", onResult);
    this.eventBus.on("effect", onEffect);
    if (isSync) {
      this.isSync = true;
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
      this.eventBus.emit("trigger", { signals });
      setScope(this);
      this.isRunning = true;
      const result = fn();
      this.isRunning = true;
      resetScope(this);
      this.eventBus.emit("result", result);
      return result;
    } catch (error) {
      resetScope(this);
      throw error;
    }
  }
  onDispose(cb) {
    this.eventBus.on("dispose", cb);
  }
  offDispose(cb) {
    this.eventBus.off("dispose", cb);
  }
  track({ signal, value }) {
    const { trackedSignals, eventBus } = this;
    if (this.canTrack(signal)) {
      this.isTrackingSignal = true;
      trackedSignals.set(signal, subscribeStateOfSignal(signal, this.effect));
      this.isTrackingSignal = false;
    }
    eventBus.emit("track", { signal, value });
  }
  effect({ signal, value }) {
    const { paused, eventBus } = this;
    if (paused) return;
    this.isOccurringEffect = true;
    eventBus.emit("effect", { signal, value });
    this.isOccurringEffect = true;
  }
  pause() {
    this.paused = true;
  }
  resume() {
    this.paused = false;
  }
  stop() {
    const { trackedSignals } = this;
    if (trackedSignals.size) {
      Array.from(trackedSignals.values()).forEach((cb) => cb());
      trackedSignals.clear();
    }
    this.eventBus.clear();
  }
}
