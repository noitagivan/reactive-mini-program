import { isFunction } from "../utils/index";
import SetupContex from "./SetupContex";

export default class GlobalContext {
  pageScopeMap = new Map();
  componentScopeMap = new WeakMap();
  instanceScope = null;
  getInstanceScope() {
    return this.instanceScope;
  }
  resetInstanceScope() {
    this.instanceScope = null;
  }
  setPageScope(id, scope) {
    if (scope) {
      this.pageScopeMap.set(id, scope);
      this.instanceScope = scope;
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
      this.instanceScope = scope;
    } else {
      this.componentScopeMap.delete(instance);
    }
    return scope;
  }
  getComponentScope(instance) {
    return this.componentScopeMap.get(instance) || null;
  }
  getParentComponentScopeOf(scope) {
    let parent = null;
    let instance = scope.instance;
    for (;;) {
      instance = instance.selectOwnerComponent();
      if (!instance) return null;
      parent = this.getComponentScope(instance);
      if (parent) return parent;
    }
  }

  exposeInstanceScope() {
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
          onAttached: scope.onAttached.bind(scope),
          offAttached: scope.offAttached.bind(scope),
          onDispose: scope.onDispose.bind(scope),
          offDispose: scope.offDispose.bind(scope),
        };
      }
      return null;
    };
    return formatScope(this.getInstanceScope());
  }

  optionsSetupContext = new SetupContex();
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
    const instanceScope = this.exposeInstanceScope();
    if (context) {
      const { isPage, isComponent, addLifetimeListener } = context;

      return {
        isPage,
        isComponent,
        addLifetimeListener: instanceScope ? addLifetimeListener : null,
        instanceScope,
      };
    }
    return null;
  }

  /**
   * @param { Function } setup
   * @param { SetupContex } context
   */
  runSetup(setup, context) {
    console.log("runSetup", context);
    this.setSetupContext(context);
    if (isFunction(setup)) {
      const scope = this.getInstanceScope();
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
        console.log(`lifetimes/${lifetime}`, this.__wxExparserNodeId__);
        ctx.getComponentScope(this)?.context.invokeLifeTimeCallback(lifetime);
      };
    });
    return hooks;
  }
  settleObserversOption(propNames, setupCbs, optCbs) {
    const runtime = this;
    const cbs = { ...optCbs };
    Object.keys(setupCbs).forEach((src) => {
      cbs[src] = function (...values) {
        runtime
          .getComponentScope(this)
          ?.context.invokeObservers(src, ...values);
        optCbs?.[src]?.call(this, ...values);
      };
    });
    if (propNames) {
      const propsWatcherSource = propNames.join(",");
      const sameSourceCallback = cbs[propsWatcherSource];
      cbs[propsWatcherSource] = function (...values) {
        runtime
          .getComponentScope(this)
          ?.context.syncSetupProps(
            Object.fromEntries(propNames.map((prop, i) => [prop, values[i]]))
          );
        sameSourceCallback?.call(this, ...values);
      };
    }
    return cbs;
  }
}
