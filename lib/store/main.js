export function defineStore(id, setupLike) {
  const effectScope = createEffectScope();
  const store = {
    inited: false,
    state: {},
    getters: {},
    actions: {},
  };

  const result = effectScope.run(() => {
    return setupLike();
  });
  Object.entries(setupResult).forEach(([name, item]) => {
    if (isWatchable(item)) {
      if (isComputedSignal(item)) {
        getters[name] = item;
      } else {
        state[name] = item;
      }
    } else if (isFunction(item)) {
      actions[name] = item;
    } else {
      state[name] = item;
    }
  });

  return {};
}
