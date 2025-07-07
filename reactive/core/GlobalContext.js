import { createEffectScope, runInSilentScope } from "../state/EffectScope";
import { isFunction, isNonNullObject } from "../utils/index";
import { cLifetimes, partialCLifetimes, pLifetimes } from "./consts";
import InstanceScope from "./InstanceScope";
import SetupContex from "./SetupContex";

export default class GlobalContext {
  pageScopeMap = new Map();
  componentScopeMap = new WeakMap();
  setPageScope(id, scope) {
    if (scope) {
      this.pageScopeMap.set(id, scope);
      this.setupInstanceScope = scope;
    } else {
      this.pageScopeMap.delete(id);
    }
    return scope;
  }
  getPageScope(id) {
    return this.pageScopeMap.get(id) || null;
  }
  setComponentScope(instance, scope) {
    if (scope) {
      this.componentScopeMap.set(instance, scope);
      this.setupInstanceScope = scope;
    } else {
      this.componentScopeMap.delete(instance);
    }
    return scope;
  }
  getComponentScope(instance) {
    return this.componentScopeMap.get(instance) || null;
  }

  setupContex = null;
  /**
   * @returns { SetupContex | null }
   */
  setSetupContext(ctx) {
    this.setupContex = ctx;
  }
  getSetupContex() {
    return this.setupContex;
  }
  exposeSetupContext() {
    const context = this.getSetupContex();
    const instanceScope = this.exposeSetupInstanceScope();
    if (context) {
      const { isPage, isComponent, addLifetimeListener } = context;

      return {
        isPage,
        isComponent,
        addLifetimeListener,
        instanceScope,
      };
    }
    return null;
  }

  setupInstanceScope = null;
  getSetupInstanceScope() {
    return this.setupInstanceScope;
  }
  resetSetupInstanceScope() {
    this.setupInstanceScope = null;
  }
  exposeSetupInstanceScope() {
    const formatScope = (scope) => {
      if (scope) {
        const { isPage, isComponent, parentScope, instance } = scope;
        const pageScope = this.getPageScope(scope.pageId);
        return {
          isPage,
          isComponent,
          getInstance: () => instance,
          getPageInstance: () => pageScope.instance,
          getParentScope: () => formatScope(parentScope),
          getPageScope: () => formatScope(pageScope),
        };
      }
      return null;
    };
    return formatScope(this.getSetupInstanceScope());
  }

  /**
   * @param { Function } setup
   * @param { SetupContex } context
   */
  runSetup(setup, context) {
    context.reset();
    this.setSetupContext(context);
    if (isFunction(setup)) {
      const scope = this.getSetupInstanceScope();
      context.setupReturns =
        setup(context.exposeDefiners(scope), context.exposeContext(scope)) ||
        {};
    }
    this.setSetupContext(null);
    return context;
  }

  createLifetimeHooks(lifetimes) {
    const ctx = this;
    const hooks = {};
    lifetimes.forEach((lifetime) => {
      hooks[lifetime] = function () {
        // console.log(`lifetimes/${lifetime}`, this.__wxExparserNodeId__);
        ctx.getComponentScope(this)?.invokeLifeTimeCallback(lifetime);
      };
    });
    return hooks;
  }
  settleObserversOption(propNames, setupCbs, optCbs) {
    const ctx = this;
    const cbs = { ...optCbs };
    setupCbs.forEach(([src, cb]) => {
      cbs[src] = function (...values) {
        ctx.getComponentScope(this)?.invokeObserversCallback(src, ...values);
        optCbs?.[src]?.call(this, ...values);
      };
    });
    if (propNames) {
      const propsWatcherSource = propNames.join(",");
      const sameSourceCallback = cbs[propsWatcherSource];
      cbs[propsWatcherSource] = function (...values) {
        ctx
          .getComponentScope(this)
          ?.syncSetupProps(
            Object.fromEntries(propNames.map((prop, i) => [prop, values[i]]))
          );
        sameSourceCallback?.call(this, ...values);
      };
    }
    return cbs;
  }
}
