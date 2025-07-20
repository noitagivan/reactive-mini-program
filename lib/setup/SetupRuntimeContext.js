import { createEffectScope } from "../state/index";
import { isFunction } from "../utils/index";
import { createSettingUpContext } from "./etc/creators";
import createInstanceLifetimeScope from "./InstanceLifetimeScope";
import AppSetupContext from "./setup-context/AppSetupContext";
import OptionsSetupContext from "./setup-context/OptionsSetupContext";
import SetupContext from "./setup-context/SetupContext";

class AppLifetimeScope {
  #effectScope = createEffectScope();
  context = null;
  run(setup) {
    try {
      this.context = new AppSetupContext(
        isFunction(setup) ? this.#effectScope.run(setup) : setup
      );
      return this.context;
    } catch (error) {
      throw error;
    }
  }
}

export default class {
  OptionsSetupContext = new OptionsSetupContext();
  constructor() {
    this.setPageScope = this.setPageScope.bind(this);
    this.getPageScope = this.getPageScope.bind(this);
    this.setComponentScope = this.setComponentScope.bind(this);
    this.getComponentScope = this.getComponentScope.bind(this);
    this.getParentScopeOf = this.getParentScopeOf.bind(this);
    this.resetInstanceLifetimeScope =
      this.resetInstanceLifetimeScope.bind(this);
  }

  /**
   * @type {SetupContext | null}
   */
  #ActiveSetupContext = null;
  /**
   * @param { SetupContext | null } ctx
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

  /**
   * @type {AppLifetimeScope | null}
   */
  #AppLifetimeScope = null;
  runAppSetup(setup) {
    if (this.#AppLifetimeScope) {
      throw new Error("cannot define App more than one time.");
    }
    this.#AppLifetimeScope = new AppLifetimeScope();
    return this.#AppLifetimeScope.run(setup);
  }
  getAppSetupRecords() {
    return Object.freeze(this.#AppLifetimeScope?.context?.setupRecords || {});
  }

  /**
   * @type {Map<string, ReturnType<createInstanceLifetimeScope>>}
   */
  #PageLifetimeScopeMap = new Map();
  /**
   * @type {WeakMap<ComponentInstance, ReturnType<createInstanceLifetimeScope>>}
   */
  #ComponentLifetimeScopeMap = new WeakMap();
  /**
   * @type {ReturnType<createInstanceLifetimeScope> | null}
   */
  #InstanceLifetimeScope = null;
  /**
   *
   * @param {ReturnType<createInstanceLifetimeScope>} scope
   */
  setInstanceLifetimeScope(scope) {
    this.#InstanceLifetimeScope = scope;
  }
  getInstanceLifetimeScope() {
    return this.#InstanceLifetimeScope;
  }
  resetInstanceLifetimeScope() {
    this.#InstanceLifetimeScope = null;
  }
  /**
   *
   * @param {string} id
   * @param {ReturnType<createInstanceLifetimeScope> | null} scope
   * @returns {ReturnType<createInstanceLifetimeScope> | null}
   */
  setPageScope(id, scope) {
    if (scope) {
      this.#PageLifetimeScopeMap.set(id, scope);
      this.setInstanceLifetimeScope(scope);
    } else {
      this.#PageLifetimeScopeMap.delete(id);
    }
    return scope;
  }
  /**
   *
   * @param {string} id
   * @returns {ReturnType<createInstanceLifetimeScope> | null}
   */
  getPageScope(id) {
    return this.#PageLifetimeScopeMap.get(id) || null;
  }
  /**
   * @param {ComponentInstance} instance
   * @param {ReturnType<createInstanceLifetimeScope> | null} scope
   * @returns {ReturnType<createInstanceLifetimeScope> | null}
   */
  setComponentScope(instance, scope) {
    if (scope) {
      this.#ComponentLifetimeScopeMap.set(instance, scope);
      this.setInstanceLifetimeScope(scope);
    } else {
      this.#ComponentLifetimeScopeMap.delete(instance);
    }
    return scope;
  }
  /**
   * @param {ComponentInstance} instance
   * @returns {ReturnType<createInstanceLifetimeScope> | null}
   */
  getComponentScope(instance) {
    return this.#ComponentLifetimeScopeMap.get(instance) || null;
  }
  /**
   * @param {ReturnType<createInstanceLifetimeScope> | null} scope
   * @returns {ReturnType<createInstanceLifetimeScope> | null}
   */
  getParentScopeOf(scope) {
    let parent = null;
    let instance = scope.context.instance;
    for (;;) {
      instance = instance?.selectOwnerComponent();
      if (!instance) return this.getPageScope(scope.pageId) || null;
      parent = this.getComponentScope(instance);
      if (parent) return parent;
    }
  }

  /**
   * @type {PageSettingUpContext & ComponentSettingUpContext | null}
   */
  #SettingUpContext = null;
  /**
   * @param {PageSettingUpContext | ComponentSettingUpContext | null} ctx
   */
  setSettingUpContext(ctx) {
    return (this.#SettingUpContext = ctx);
  }
  getSettingUpContext() {
    return this.#SettingUpContext;
  }

  /**
   * @param {CommonFunction<Record<string,unknown>, [SettingUpContext]>} setup
   * @param {SetupContext} ctx
   * @returns {SetupContext}
   */
  runSetup(setup, ctx) {
    this.setSetupContext(ctx).runtimeContext = this;
    if (isFunction(setup)) {
      const settingUpContext = this.setSettingUpContext(
        createSettingUpContext(ctx, this.getInstanceLifetimeScope())
      );
      if (settingUpContext.isSettingUpInstance) {
        console.info(
          ctx.isPage ? "[[ PAGE ] Created ]" : "[[ COMPONENT ] Created ]",
          new Date(),
          settingUpContext
        );
      }

      ctx.setupReturns = setup(settingUpContext) || {};
      this.setSettingUpContext(null);
    }
    return ctx;
  }
}
