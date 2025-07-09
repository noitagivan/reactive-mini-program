import { isSignal, isValueRefSignal } from "../state/index";
import {
  isArray,
  isConstructor,
  isFunction,
  isNonEmptyString,
  isNonNullObject,
  onceInvokable,
} from "../utils/index";
import { invokeDefinedComponentMethod, invokeDefinedPageMethod } from "./setup";

export default class SetupContex {
  instance = null;
  isSetupIdle = true;
  isPage = false;
  isComponent = false;
  setupRecords = {
    lifetimes: {},
    pageHooks: {},
    componentProps: {},
    componentObservers: {},
  };
  setupReturns = {};

  constructor(configs = {}) {
    Object.assign(this, configs);
    this.addLifetimeListener = this.addLifetimeListener.bind(this);
    this.setPageHook = this.setPageHook.bind(this);
  }
  check(action) {
    if (this.isSetupIdle)
      throw new Error(`cannot ${action} without setup context`);
  }
  exposeContext(scope) {
    const ctx = {
      $this: this.instance || null,
      isSettingUpOptions: !this.instance,
      isSettingUpInstance: !!this.instance,
      isPage: this.isPage,
      isComponent: this.isComponent,
    };
    if (this.isComponent) {
      ctx.emit =
        scope?.instance.triggerEvent.bind(scope.instance) || (() => {});
      ctx.plainProps = scope ? () => scope.context.getSetupProps() : () => ({});
    }
    this.isSetupIdle = false;
    return Object.freeze(ctx);
  }
  exposeDefiners(scope) {
    const definers = {};
    if (this.isPage) {
    } else if (this.isComponent) {
      definers.defineProps = onceInvokable(
        this.defineProps.bind(this, scope),
        "cannot define properties more than once for a component"
      );
      definers.observe = this.addObserver.bind(this, scope);
    }
    return Object.freeze(definers);
  }

  /**
   * @param { string } name
   * @param { Function } hook
   */
  setPageHook(name, hook) {
    this.check("set page hooks");
    if (this.isPage && isNonEmptyString(name) && isFunction(hook)) {
      this.setupRecords.pageHooks[name] = hook;
    }
  }
  /**
   *
   * @param {*} scope
   * @param {*} definations
   * @returns
   */
  defineProps(scope, definations) {
    this.check("define properties");
    if (isNonNullObject(definations) === false)
      throw new Error("properties must be a non-null object");
    if (scope) return scope.context.getPackagedProps();

    const names = [];
    const option = {};
    const values = {};
    Object.entries(definations).forEach(([name, property]) => {
      if (isNonNullObject(property)) {
        values[name] = property.value;
      } else if (isConstructor(property)) {
        try {
          values[name] = property();
        } catch (error) {
          values[name] = undefined;
        }
      } else return;
      option[name] = property;
      names.push(name);
    });
    this.setupRecords.componentProps = { names, option, values };
    return Object.freeze({ ...values });
  }
  /**
   * @param { string } lifetime 生命周期名称
   * @param { () => void } listener 生命周期回调函数
   */
  addLifetimeListener(lifetime, listener) {
    this.check("add lifetime listeners");
    if (isFunction(listener)) {
      const { lifetimes } = this.setupRecords;
      lifetimes[lifetime] = lifetimes[lifetime] || [];
      lifetimes[lifetime].push(listener);
    }
  }
  /**
   *
   * @param {*} scope
   * @param {*} src
   * @param {*} observer
   * @returns
   */
  addObserver(scope, src, observer) {
    this.check("define observers");
    if (isFunction(observer)) {
      src = isNonEmptyString(src)
        ? src
        : isArray(src)
        ? src.filter(isNonEmptyString).join(",")
        : "";
      if (src) {
        const { componentObservers } = this.setupRecords;
        componentObservers[src] = componentObservers[src] || [];
        if (scope) {
          const index = componentObservers[src].length;
          componentObservers[src].push(observer);
          return () => this.removeObserver(src, index);
        }
      }
    }
    return () => false;
  }
  removeObserver(src, index) {
    const { componentObservers } = this.setupRecords;
    if (componentObservers?.[src]) {
      return delete componentObservers[src][index];
    }
    return false;
  }
  initDataAndMethods(options) {
    this.isSetupIdle = true;
    const data = { ...options.data };
    const methods = { ...options.methods };
    Object.entries(this.setupReturns).forEach(([name, property]) => {
      if (isFunction(property)) {
        if (isSignal(property)) {
          data[name] = property();
        } else {
          if (this.isPage) {
            methods[name] = function (...args) {
              return invokeDefinedPageMethod(this, name, ...args);
            };
          } else if (this.isComponent) {
            methods[name] = function (...args) {
              return invokeDefinedComponentMethod(this, name, ...args);
            };
          }
        }
      } else if (isValueRefSignal(property)) {
        data[name] = property.value;
      } else {
        data[name] = property;
      }
    });
    return { data, methods };
  }
  reset(configs = {}) {
    this.isSetupIdle = true;
    this.isPage = false;
    this.isComponent = false;
    this.setupRecords = {
      lifetimes: {},
      pageHooks: {},
      componentProps: {},
      componentObservers: {},
    };
    this.setupReturns = {};
    this.instance = null;
    return Object.assign(this, configs);
  }
}
