import { isFunction } from "../utils/index";
import OptionsSetupContext from "./setup-context/OptionsSetupContext";
import SetupContext from "./setup-context/SetupContext";

export default class {
  pageScopeMap = new Map();
  componentScopeMap = new WeakMap();
  #instanceScope = null;
  #setInstanceScope(scope) {
    this.#instanceScope = scope;
  }
  #getInstanceScope() {
    return this.#instanceScope;
  }
  resetInstanceScope() {
    this.#instanceScope = null;
  }
  setPageScope(id, scope) {
    if (scope) {
      this.pageScopeMap.set(id, scope);
      this.#setInstanceScope(scope);
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
      this.#setInstanceScope(scope);
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
    return formatScope(this.#getInstanceScope());
  }

  optionsSetupContext = new OptionsSetupContext();
  #setupContext = null;
  /**
   * @returns { SetupContext | null }
   */
  setSetupContext(ctx) {
    const _ctx = ctx || this.#setupContext;
    this.#setupContext = ctx;
    return _ctx;
  }
  getSetupContext() {
    return this.#setupContext;
  }
  exposeSetupContext() {
    const ctx = this.getSetupContext();
    const instanceScope = this.exposeInstanceScope();
    if (ctx) {
      const { isPage, isComponent } = ctx;

      return {
        isPage,
        isComponent,
        observe: ctx.addDataAndSignalObserver.bind(
          ctx,
          this.#getInstanceScope()
        ),
        inject: ctx.injectProvidedData.bind(ctx, this.#getInstanceScope()),
        on: ctx.addLifetimeListener.bind(ctx),
        listen: ctx.addPageEventListener.bind(ctx, this.#getInstanceScope()),
        instanceScope,
      };
    }
    return null;
  }

  /**
   * @param { Function } setup
   * @param { SetupContext } ctx
   */
  runSetup(setup, ctx) {
    this.setSetupContext(ctx).runtime = this;
    if (isFunction(setup)) {
      const expose = ctx.expose(this.#getInstanceScope());
      if (expose.isSettingUpInstance) {
        console.info(
          ctx.isPage ? "[ Load Page ]" : "[ Create Component ]",
          new Date(),
          expose
        );
      }
      ctx.setupReturns = setup(expose) || {};
    }
    return ctx;
  }
}
