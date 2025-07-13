import InstanceSetupContext from "./InstanceSetupContext";

/**
 *
 * @param {*} page
 * @returns { InstanceSetupContext }
 */
function getPageScope(page) {
  return this.getPageScope(page.getPageId());
}
/**
 *
 * @param {*} component
 * @returns { InstanceSetupContext }
 */
function getComponentScope(component) {
  return this.getComponentScope(component);
}

export function createRelationEventForwarder(
  runtime,
  relationid,
  eventname,
  isPage
) {
  const getScope = isPage
    ? getPageScope.bind(runtime)
    : getComponentScope.bind(runtime);
  return function (...args) {
    return getScope(this)?.context.forwardRelationEvent(
      relationid,
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

export function createExportHandlerCallingForwarder(runtime) {
  const getScope = getComponentScope.bind(runtime);
  return function () {
    console.log("onExport");
    return getScope(this)?.context.onExpose();
  };
}
