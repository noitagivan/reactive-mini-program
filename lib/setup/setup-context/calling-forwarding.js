import InstanceSetupContext from "./InstanceSetupContext";

/**
 *
 * @param { PageInstance } page
 * @returns { InstanceSetupContext }
 */
function getPageScope(page) {
  return this.getPageScope(page.getPageId());
}
/**
 *
 * @param { ComponentInstance } component
 * @returns { InstanceSetupContext }
 */
function getComponentScope(component) {
  return this.getComponentScope(component);
}

export function createRelationEventForwarder(
  rtCtx,
  relationid,
  eventname,
  isPage
) {
  const getScope = isPage
    ? getPageScope.bind(rtCtx)
    : getComponentScope.bind(rtCtx);
  return function (...args) {
    return getScope(this)?.context.forwardRelationEvent(
      relationid,
      eventname,
      ...args
    );
  };
}

export function createDataChangeEventForwarder(
  rtCtx,
  src,
  isPage,
  optObserver
) {
  const getScope = isPage
    ? getPageScope.bind(rtCtx)
    : getComponentScope.bind(rtCtx);
  return function (...values) {
    getScope(this)?.context.forwardDataChangeEvent(src, ...values);
    optObserver?.call(this, ...values);
  };
}

export function createPropSyncingForwarder(
  rtCtx,
  propnames,
  sameSourceCallback
) {
  const getScope = getComponentScope.bind(rtCtx);
  return function (...values) {
    getScope(this)?.context.syncSetupPropValues(
      Object.fromEntries(propnames.map((prop, i) => [prop, values[i]]))
    );
    sameSourceCallback?.call(this, ...values);
  };
}

export function createMethodInvokationForwarder(rtCtx, methodname, isPage) {
  const getScope = isPage
    ? getPageScope.bind(rtCtx)
    : getComponentScope.bind(rtCtx);
  return function (...args) {
    return getScope(this)?.context.invokeSetupMethod(methodname, ...args);
  };
}

export function createExportHandleCallingForwarder(rtCtx) {
  const getScope = getComponentScope.bind(rtCtx);
  return function () {
    return getScope(this)?.context.onExpose();
  };
}
