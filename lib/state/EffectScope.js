import { EventBus } from "../utils/index";

const CONTEXT = {
  effectFreeScope: null,
  currentEffectScope: null,
  setCurrentScope(scope) {
    if (scope && scope instanceof EffectScope) {
      this.currentEffectScope = scope;
    } else {
      this.currentEffectScope = null;
    }
  },
  getCurrentScope() {
    return this.currentEffectScope;
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
    if (CONTEXT.currentEffectScope) {
      this.#parentScope = CONTEXT.currentEffectScope;
      this.#parentScope.on("dispose", cb);
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

CONTEXT.effectFreeScope = new EffectScope(true);

export function runInEffectFreeScope(fn) {
  return CONTEXT.effectFreeScope.run(fn);
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

export function onScopeDispose(cb) {
  const scope = CONTEXT.getCurrentScope();
  if (!scope || scope.isEffectFree) return false;
  scope.on("dispose", cb);
  return true;
}
