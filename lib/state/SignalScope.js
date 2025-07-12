import { EventBus } from "../utils/index";

const CONTEXT = {
  effectFreeScope: null,
  currentSignalScope: null,
  setCurrentScope(scope) {
    if (scope && scope instanceof SignalScope) {
      this.currentSignalScope = scope;
    } else {
      this.currentSignalScope = null;
    }
  },
  getCurrentScope() {
    return this.currentSignalScope;
  },
};

class SignalScope extends EventBus {
  #isRunning = false;
  #parentScope = null;

  get isRunning() {
    return this.#isRunning;
  }
  constructor() {
    super(true);
    this.#parentScope = CONTEXT.currentSignalScope;
  }
  run(fn) {
    try {
      CONTEXT.setCurrentScope(this);
      this.#isRunning = true;
      const result = fn();
      this.#isRunning = true;
      CONTEXT.setCurrentScope(this.#parentScope);
      return result;
    } catch (error) {
      CONTEXT.setCurrentScope(this.#parentScope);
      throw error;
    }
  }
  stop() {}
}

class EffectScope extends SignalScope {
  isEffective = true;
  stop() {
    this.emit("effectscopedispose").clear();
  }
}

CONTEXT.effectFreeScope = new (class EffectFreeScope extends SignalScope {
  isSilent = true;
})();

export function runInEffectFreeScope(fn) {
  return CONTEXT.effectFreeScope.run(fn);
}

export function isRunInEffectFreeScope() {
  return CONTEXT.getCurrentScope()?.isSilent ? true : false;
}

export default function createEffectScope() {
  const scope = new EffectScope();
  const run = scope.run.bind(scope);
  const stop = scope.stop.bind(scope);
  return { run, stop };
}

export function getCurrentEffectScope() {
  const scope = CONTEXT.getCurrentScope();
  if (scope?.isEffective) {
    const run = scope.run.bind(scope);
    const stop = scope.stop.bind(scope);
    return { run, stop };
  }
  return null;
}

export function onScopeDispose(cb) {
  const scope = CONTEXT.getCurrentScope();
  if (scope?.isEffective) scope.on("effectscopedispose", cb);
}

export function offScopeDispose(cb) {
  const scope = CONTEXT.getCurrentScope();
  if (scope?.isEffective) scope.off("effectscopedispose", cb);
}
