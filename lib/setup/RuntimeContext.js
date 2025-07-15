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
  OptionsSetupContext = new OptionsSetupContext();
  #ActiveSetupContext = null;
  /**
   * @returns { SetupContext | null }
   */
  setSetupContext(ctx) {
    const _ctx = ctx || this.#ActiveSetupContext;
    this.#ActiveSetupContext = ctx;
    return _ctx;
  }
  getSetupContext() {
    return this.#ActiveSetupContext;
  }
  exposeActiveSetupContext() {
    const ctx = this.getSetupContext();
    if (ctx) {
      const { isPage, isComponent } = ctx;
      const scope = this.getInstanceLifetimeScope();
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

  #PageLifetimeScopeMap = new Map();
  #ComponentLifetimeScopeMap = new WeakMap();
  #InstanceLifetimeScope = null;
  setInstanceLifetimeScope(scope) {
    this.#InstanceLifetimeScope = scope;
  }
  getInstanceLifetimeScope() {
    return this.#InstanceLifetimeScope;
  }
  resetInstanceLifetimeScope() {
    this.#InstanceLifetimeScope = null;
  }
  setPageScope(id, scope) {
    if (scope) {
      this.#PageLifetimeScopeMap.set(id, scope);
      this.setInstanceLifetimeScope(scope);
    } else {
      this.#PageLifetimeScopeMap.delete(id);
    }
    return scope;
  }
  getPageScope(id) {
    return this.#PageLifetimeScopeMap.get(id) || null;
  }
  setComponentScope(instance, scope) {
    if (scope) {
      this.#ComponentLifetimeScopeMap.set(instance, scope);
      this.setInstanceLifetimeScope(scope);
    } else {
      this.#ComponentLifetimeScopeMap.delete(instance);
    }
    return scope;
  }
  getComponentScope(instance) {
    return this.#ComponentLifetimeScopeMap.get(instance) || null;
  }
  getParentComponentScopeOf(scope) {
    let parent = null;
    let instance = scope.context.instance;
    for (;;) {
      instance = instance?.selectOwnerComponent();
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
            return pageScope.context.instance;
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
    return formatScope(this.getInstanceLifetimeScope());
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
        this.getInstanceLifetimeScope()
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
