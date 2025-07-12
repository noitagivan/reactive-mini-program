import { isFunction } from "../utils/index";
import OptionsSetupContext from "./setup-context/OptionsSetupContext";
import SetupContex from "./setup-context/SetupContext";

export default class {
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
          onMounted: scope.addLifeTimeListener.bind(scope, "mounted"),
          offMounted: scope.removeLifeTimeListener.bind(scope, "mounted"),
          onDispose: scope.addLifeTimeListener.bind(scope, "dispose"),
          offDispose: scope.removeLifeTimeListener.bind(scope, "dispose"),
        };
      }
      return null;
    };
    return formatScope(this.getInstanceScope());
  }

  optionsSetupContext = new OptionsSetupContext();
  setupContex = null;
  /**
   * @returns { SetupContex | null }
   */
  setSetupContext(ctx) {
    this.setupContex = ctx;
    return ctx;
  }
  getSetupContex() {
    return this.setupContex;
  }
  exposeSetupContext() {
    const ctx = this.getSetupContex();
    const instanceScope = this.exposeInstanceScope();
    if (ctx) {
      const { isPage, isComponent } = ctx;

      return {
        isPage,
        isComponent,
        observe: ctx.addDataAndSignalObserver.bind(ctx, instanceScope),
        inject: ctx.injectProvidedData.bind(ctx, instanceScope),
        on: ctx.addLifetimeListener.bind(ctx, instanceScope),
        listen: ctx.addPageEventListener.bind(ctx, instanceScope),
        instanceScope,
      };
    }
    return null;
  }

  /**
   * @param { Function } setup
   * @param { SetupContex } ctx
   */
  runSetup(setup, ctx) {
    this.setSetupContext(ctx).runtime = this;
    if (isFunction(setup)) {
      const scope = this.getInstanceScope();
      ctx.setupReturns =
        setup(ctx.exposeDefiners(scope), ctx.exposeContext(scope)) || {};
    }
    this.setSetupContext(null);
    return ctx;
  }
}
