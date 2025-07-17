import { EventBus } from "../utils/index";

const CONTEXT = {
  EFFECT_FREE_SCOPE: null,
  CURR_EFFECT_SCOP: null,
  setCurrentScope(scope) {
    if (scope && scope instanceof EffectScope) {
      this.CURR_EFFECT_SCOP = scope;
    } else {
      this.CURR_EFFECT_SCOP = null;
    }
  },
  getCurrentScope() {
    return this.CURR_EFFECT_SCOP;
  },
};

class EffectScope extends EventBus {
  #isRunning = false;
  #parentScope = null;
  #isEffectFree = false;

  get isEffectFree() {
    return this.#isEffectFree;
  }
  get isRunning() {
    return this.#isRunning;
  }
  constructor(isEffectFree = false) {
    super(true);
    this.#isEffectFree = isEffectFree;
    if (CONTEXT.CURR_EFFECT_SCOP) {
      this.#parentScope = CONTEXT.CURR_EFFECT_SCOP;
      this.#parentScope.on("dispose", handle);
    }
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
  stop() {
    this.emit("dispose").clear();
  }
}

CONTEXT.EFFECT_FREE_SCOPE = new EffectScope(true);

export function runInEffectFreeScope(fn) {
  return CONTEXT.EFFECT_FREE_SCOPE.run(fn);
}

export function isRunInEffectFreeScope() {
  return CONTEXT.getCurrentScope()?.isEffectFree ? true : false;
}

export default function createEffectScope() {
  const scope = new EffectScope();
  const run = scope.run.bind(scope);
  const stop = scope.stop.bind(scope);
  return { run, stop };
}

export function getCurrentEffectScope() {
  const scope = CONTEXT.getCurrentScope();
  if (scope) {
    const run = scope.run.bind(scope);
    const stop = scope.stop.bind(scope);
    return { run, stop };
  }
  return null;
}

export function onScopeDispose(handle) {
  const scope = CONTEXT.getCurrentScope();
  if (!scope || scope.isEffectFree) return false;
  scope.on("dispose", handle);
  return true;
}
