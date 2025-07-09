import { isFunction, scheduleMicrotask } from "../utils/index";
import { subscribeSignal } from "./signal";

const debounceEffect = (fn) => {
  let pending = false;
  let latestArgs;

  return function (...args) {
    latestArgs = args;

    if (!pending) {
      pending = true;
      scheduleMicrotask(() => {
        const applyArgs = latestArgs;
        latestArgs = undefined;
        pending = false;
        fn(...applyArgs);
      });
    }
  };
};

export default class TrackingScope {
  static get emptyWatchHandle() {
    const stop = () => {};
    stop.pause = () => {};
    stop.resume = () => {};
    stop.stop = stop;
    return Object.freeze(stop);
  }

  isRunning = false;
  isSync = false;
  paused = false;
  handlers = {};
  trackedSignalMap = new Map();

  constructor({ onTrigger, onTrack, onSignal, onResult, isSync = false } = {}) {
    this.handlers = {
      onDisposeCallbacks: new Set(),
      onTrigger: isFunction(onTrigger) ? onTrigger : null,
      onTrack: isFunction(onTrack) ? onTrack : null,
      onSignal: isFunction(onSignal) ? onSignal : null,
      onResult: isFunction(onResult) ? onResult : null,
    };
    if (isSync) {
      this.isSync = true;
      this.effect = this.effect.bind(this);
    } else {
      this.effect = debounceEffect(this.effect.bind(this));
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
    return this.trackedSignalMap.has(signal);
  }
  canTrack(signal) {
    return this.hasTracked(signal) === false;
  }
  run(fn, ctx) {
    try {
      const { onTrigger, onResult } = this.handlers;
      onTrigger?.(ctx.triggerer);
      ctx.setScope(this);
      this.isRunning = true;
      const result = fn();
      this.isRunning = true;
      ctx.resetScope(this);
      onResult?.(result);
      return result;
    } catch (error) {
      ctx.resetScope(this);
      throw error;
    }
  }
  onDispose(cb) {
    const { onDisposeCallbacks } = this.handlers;
    onDisposeCallbacks.add(cb);
  }
  offDispose(cb) {
    const { onDisposeCallbacks } = this.handlers;
    onDisposeCallbacks.delete(cb);
  }
  track({ signal, value }) {
    const {
      trackedSignalMap,
      handlers: { onTrack },
    } = this;
    if (this.canTrack(signal)) {
      trackedSignalMap.set(signal, subscribeSignal(signal, this.effect));
    }
    onTrack?.({ signal, value });
  }
  effect({ signal, value }) {
    const { paused, handlers } = this;
    if (paused) return;
    handlers.onSignal?.({ signal, value });
  }
  pause() {
    this.paused = true;
  }
  resume() {
    this.paused = false;
  }
  stop() {
    const { trackedSignalMap } = this;
    if (trackedSignalMap.size) {
      Array.from(trackedSignalMap.values()).forEach((cb) => cb());
      trackedSignalMap.clear();
    }
    this.handlers = null;
  }
}
