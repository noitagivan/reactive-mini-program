import { isFunction } from "../utils/index";
import {
  componentFullLifetimeNames,
  pageEventNames,
  pageLifetimeMap,
  scopeLifetimeNames,
} from "./common/index";
import createDefinationContext from "./common/creators";
import OptionsSetupContext from "./setup-context/OptionsSetupContext";
import SetupContext from "./setup-context/SetupContext";

export default class {
  pageScopeMap = new Map();
  componentScopeMap = new WeakMap();
  #instanceScope = null;
  #setInstanceSetupScope(scope) {
    this.#instanceScope = scope;
  }
  #getInstanceSetupScope() {
    return this.#instanceScope;
  }
  resetInstanceSetupScope() {
    this.#instanceScope = null;
  }
  setPageScope(id, scope) {
    if (scope) {
      this.pageScopeMap.set(id, scope);
      this.#setInstanceSetupScope(scope);
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
      this.#setInstanceSetupScope(scope);
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
  exposeInstanceSetupScope() {
    const formatScope = (scope) => {
      if (scope) {
        const { isPage, isComponent, parentScope, instance } = scope;
        const pageScope = this.getPageScope(scope.pageId);
        let exposedParentScope = null;
        let exposedPageScope = null;
        return {
          isPage,
          isComponent,
          get instance() {
            return instance;
          },
          get pageInstance() {
            return pageScope.instance;
          },
          getParentScope: () => {
            if (!exposedParentScope) {
              exposedParentScope = formatScope(parentScope);
            }
            return exposedParentScope;
          },
          getPageScope: () => {
            if (!exposedPageScope) {
              exposedPageScope = formatScope(pageScope);
            }
            return exposedPageScope;
          },
          on: (lifetime, handler) => {
            if (scopeLifetimeNames.includes(lifetime)) {
              return scope.addLifeTimeListener(lifetime, handler);
            }
            return false;
          },
        };
      }
      return null;
    };
    return formatScope(this.#getInstanceSetupScope());
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

    if (ctx) {
      const { isPage, isComponent } = ctx;
      const instanceScope = this.#getInstanceSetupScope();
      return {
        isPage,
        isComponent,
        observe: ctx.addDataAndSignalObserver.bind(ctx, instanceScope),
        inject: ctx.injectProvidedData.bind(ctx, instanceScope),
        on: (name, handler) => {
          if (pageEventNames.includes(name)) {
            if (instanceScope) {
              return ctx.addPageEventListener(instanceScope, name, handler);
            }
            return false;
          }
          if (ctx.isComponent) {
            if (componentFullLifetimeNames.includes(name)) {
              return ctx.addLifetimeListener(name, handler);
            }
            return false;
          }
          if (ctx.isPage) {
            if (pageLifetimeMap[name]) {
              return ctx.addLifetimeListener(name, handler);
            }
          }
          return false;
        },
        scope: this.exposeInstanceSetupScope(),
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
      const definationContext = createDefinationContext(
        ctx,
        this.#getInstanceSetupScope()
      );
      if (definationContext.isSettingUpInstance) {
        console.info(
          ctx.isPage ? "[ Load Page ]" : "[ Create Component ]",
          new Date(),
          definationContext
        );
      }
      ctx.setupReturns = setup(definationContext) || {};
    }
    return ctx;
  }
}
