import { mergeCallbacks } from "../utils/index";

const CONTEXT = {
  silentScope: null,
  currentScope: null,
  setCurrentScope(scope) {
    if (scope && scope instanceof Scope) {
      this.currentScope = scope;
      // console.log("[ Current Scope ]", this.currentScope);
    } else {
      this.currentScope = null;
    }
  },
  getCurrentScope() {
    return this.currentScope;
  },
};

class Scope {
  parentScope = null;
  handlers = {};
  constructor() {
    this.parentScope = CONTEXT.currentScope;
  }
  run(fn) {
    try {
      CONTEXT.setCurrentScope(this);
      const result = fn();
      CONTEXT.setCurrentScope(this.parentScope);
      return result;
    } catch (error) {
      CONTEXT.setCurrentScope(this.parentScope);
      throw error;
    }
  }
  stop() {}
}

class EffectScope extends Scope {
  isEffective = true;
  constructor() {
    super();
    this.handlers.onDisposeCallbacks = new Set();
  }
  onDispose(cb) {
    const { onDisposeCallbacks } = this.handlers;
    onDisposeCallbacks.add(cb);
  }
  offDispose(cb) {
    const { onDisposeCallbacks } = this.handlers;
    onDisposeCallbacks.delete(cb);
  }
  stop() {
    const { onDisposeCallbacks } = this.handlers;
    if (onDisposeCallbacks.size) {
      mergeCallbacks(Array.from(onDisposeCallbacks.values()))();
      onDisposeCallbacks.clear();
    }
  }
}

CONTEXT.silentScope = new (class SilentScope extends Scope {
  isSilent = true;
})();

export function runInSilentScope(fn) {
  return CONTEXT.silentScope.run(fn);
}

export function isRunInSilentScope() {
  return CONTEXT.getCurrentScope()?.isSilent ? true : false;
}

export function createEffectScope() {
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
  scope?.onDispose?.(cb);
}

export function offScopeDispose(cb) {
  const scope = CONTEXT.getCurrentScope();
  scope?.offDispose?.(cb);
}
