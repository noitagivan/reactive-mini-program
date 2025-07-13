import { isFunction } from "../utils/index";
import {
  componentFullLifetimeNames,
  pageEventNames,
  pageLifetimeMap,
  scopeLifetimeNames,
} from "./common/index";
import createSettingUpContext from "./common/creators";
import OptionsSetupContext from "./setup-context/OptionsSetupContext";
import SetupContext from "./setup-context/SetupContext";

export default class {
  pageLifetimeScopeMap = new Map();
  componentLifetimeScopeMap = new WeakMap();
  #instanceLifetimeScope = null;
  #setInstanceLifetimeScope(scope) {
    this.#instanceLifetimeScope = scope;
  }
  #getInstanceLifetimeScope() {
    return this.#instanceLifetimeScope;
  }
  resetInstanceLifetimeScope() {
    this.#instanceLifetimeScope = null;
  }
  setPageScope(id, scope) {
    if (scope) {
      this.pageLifetimeScopeMap.set(id, scope);
      this.#setInstanceLifetimeScope(scope);
    } else {
      this.pageLifetimeScopeMap.delete(id);
    }
    return scope;
  }
  getPageScope(id) {
    return this.pageLifetimeScopeMap.get(id) || null;
  }
  setComponentScope(instance, scope) {
    if (scope) {
      this.componentLifetimeScopeMap.set(instance, scope);
      this.#setInstanceLifetimeScope(scope);
    } else {
      this.componentLifetimeScopeMap.delete(instance);
    }
    return scope;
  }
  getComponentScope(instance) {
    return this.componentLifetimeScopeMap.get(instance) || null;
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
  exposeInstanceLifetimeScope() {
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
    return formatScope(this.#getInstanceLifetimeScope());
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
  exposeActiveSetupContext() {
    const ctx = this.getSetupContext();

    if (ctx) {
      const { isPage, isComponent } = ctx;
      const scope = this.#getInstanceLifetimeScope();
      return {
        isPage,
        isComponent,
        observe: ctx.addDataAndSignalObserver.bind(ctx, scope),
        inject: ctx.injectProvidedData.bind(ctx, scope),
        on: (name, handler) => {
          if (pageEventNames.includes(name)) {
            if (scope) {
              return ctx.addPageEventListener(scope, name, handler);
            }
            return false;
          }
          if (ctx.isComponent) {
            if (componentFullLifetimeNames.includes(name)) {
              return ctx.addLifetimeListener(scope, name, handler);
            }
            return false;
          }
          if (ctx.isPage) {
            if (pageLifetimeMap[name]) {
              return ctx.addLifetimeListener(scope, name, handler);
            }
          }
          return false;
        },
        instanceLifetimeScope: this.exposeInstanceLifetimeScope(),
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
      const definationContext = createSettingUpContext(
        ctx,
        this.#getInstanceLifetimeScope()
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
