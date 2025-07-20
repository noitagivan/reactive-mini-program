import createInstanceLifetimeScope from "../InstanceLifetimeScope";
import RuntimeContext from "../SetupRuntimeContext";
import {
  componentFullLifetimeNames,
  pageEventNames,
  pageLifetimeMap,
  scopeLifetimeNames,
} from "./constants";

/**
 * @param {ReturnType<createInstanceLifetimeScope>} scope
 * @param {RuntimeContext} rtCtx
 * @returns {ExposedLifetimeScope | null}
 */
const formatExposedILTScope = (scope, rtCtx) => {
  if (scope) {
    const { isPage, isComponent, parentScope, instance } = scope;
    const pageScope = rtCtx.getPageScope(scope.pageId);
    let exposedParentScope = null;
    let exposedPageScope = null;
    return {
      isPage,
      isComponent,
      get instance() {
        return instance;
      },
      get pageInstance() {
        return pageScope.context.instance;
      },
      getParentScope: () => {
        if (!exposedParentScope) {
          exposedParentScope = formatExposedILTScope(parentScope, rtCtx);
        }
        return exposedParentScope;
      },
      getPageScope: () => {
        if (!exposedPageScope) {
          exposedPageScope = formatExposedILTScope(pageScope, rtCtx);
        }
        return exposedPageScope;
      },
      /**
       *
       * @param {string} lifetime
       * @param {ParamLessCallback} handle
       * @returns
       */
      on: (lifetime, handle) => {
        if (scopeLifetimeNames.includes(lifetime)) {
          return scope.addLifetimeHandle(lifetime, handle);
        }
        return false;
      },
    };
  }
  return null;
};
function exposeInstanceLifetimeScope(rtCtx) {
  return formatExposedILTScope(rtCtx.getInstanceLifetimeScope(), rtCtx);
}

/**
 *
 * @param {RuntimeContext} rtCtx
 * @returns {ExposedSettingUpContext | {}}
 */
function exposeSettingUpContext(rtCtx) {
  const settingUpContext = rtCtx.getSettingUpContext();
  if (settingUpContext) {
    const { behaviors, extClasses, inject, observe, provide, defineRelation } =
      settingUpContext;
    return {
      behaviors,
      extClasses,
      inject,
      observe,
      provide,
      defineRelation,
    };
  }
  return {};
}

/**
 * @param {RuntimeContext} rtCtx
 * @returns {ExposedActiveSetupContext}
 */
export function exposeActiveSetupContext(rtCtx) {
  const ctx = rtCtx.getSetupContext();
  if (ctx) {
    const { isPage, isComponent } = ctx;
    const scope = rtCtx.getInstanceLifetimeScope();
    return {
      isPage,
      isComponent,
      lifetimeScope: exposeInstanceLifetimeScope(rtCtx),
      settingUpContext: exposeSettingUpContext(rtCtx),
      /**
       * @param {string} name
       * @param {EventHandle | ParamLessCallback} listener
       * @returns
       */
      on: (name, listener) => {
        if (pageEventNames.includes(name)) {
          if (scope) {
            return ctx.addPageEventHandle(scope, name, listener);
          }
          return false;
        }
        if (ctx.isComponent) {
          if (componentFullLifetimeNames.includes(name)) {
            return ctx.addLifetimeListener(scope, name, listener);
          }
          return false;
        }
        if (ctx.isPage) {
          if (pageLifetimeMap[name]) {
            return ctx.addLifetimeListener(scope, name, listener);
          }
        }
        return false;
      },
    };
  }
  return null;
}
