function getPageScope(page) {
  return this.getPageScope(page.getPageId());
}
function getComponentScope(component) {
  return this.getComponentScope(component);
}

export function createRelationEventForwarder(
  runtime,
  relationname,
  eventname,
  isPage
) {
  const getScope = isPage
    ? getPageScope.bind(runtime)
    : getComponentScope.bind(runtime);
  return function (...args) {
    return getScope(this)?.context.forwardRelationEvent(
      relationname,
      eventname,
      ...args
    );
  };
}

export function createObserverInvokationForwarder(
  runtime,
  src,
  isPage,
  optObserver
) {
  const getScope = isPage
    ? getPageScope.bind(runtime)
    : getComponentScope.bind(runtime);
  return function (...values) {
    getScope(this)?.context.forwardDataChangeEvent(src, ...values);
    optObserver?.call(this, ...values);
  };
}

export function createPropsObserverInvokationForwarder(
  runtime,
  propnames,
  sameSourceCallback
) {
  const getScope = getComponentScope.bind(runtime);
  return function (...values) {
    getScope(this)?.context.syncSetupPropValues(
      Object.fromEntries(propnames.map((prop, i) => [prop, values[i]]))
    );
    sameSourceCallback?.call(this, ...values);
  };
}

export function createMethodCallingForwarder(runtime, methodname, isPage) {
  const getScope = isPage
    ? getPageScope.bind(runtime)
    : getComponentScope.bind(runtime);
  return function (...args) {
    return getScope(this)?.context.invokeSetupMethod(methodname, ...args);
  };
}

export function createExposedMethodCallingForwarder(
  runtime,
  methodname,
  isPage
) {
  const getScope = isPage
    ? getPageScope.bind(runtime)
    : getComponentScope.bind(runtime);
  return function (...args) {
    return getScope(this)?.context.invokeExposedMethod(methodname, ...args);
  };
}
