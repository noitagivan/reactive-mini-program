import {
  isSignal,
  isWatchableSignal,
  subscribeSignal,
  updateSignal,
} from "../state/signals";
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
  isSetupIdle = true;
  isPage = false;
  isComponent = false;
  lifetimes = {};
  pageHooks = {};
  componentProps = {};
  componentObservers = {};
  setupReturns = {};

  constructor(configs = {}) {
    Object.assign(this, configs);
    this.addLifetimeListener = this.addLifetimeListener.bind(this);
    this.setPageHook = this.setPageHook.bind(this);
  }
  exposeContext(scope) {
    const ctx = {
      $this: scope?.instance || null,
      isSettingUpOptions: !scope?.instance,
      isSettingUpInstance: !!scope?.instance,
      isPage: this.isPage,
      isComponent: this.isComponent,
    };
    if (this.isComponent) {
      ctx.emit = scope
        ? scope.instance.triggerEvent.bind(scope.instance)
        : () => {};
      ctx.plainProps = scope ? () => scope.getSetupProps() : () => ({});
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
  check(action) {
    if (this.isSetupIdle)
      throw new Error(`cannot ${action} without setup context`);
  }
  /**
   * @param { string } name
   * @param { Function } method
   */
  setPageHook(name, hook) {
    if (this.isPage && isNonEmptyString(name) && isFunction(hook)) {
      this.pageHooks[name] = hook;
    }
  }
  defineProps(scope, definations) {
    this.check("define properties");
    if (isNonNullObject(definations) === false)
      throw new Error("properties must be a non-null object");
    if (scope) return scope.getPackagingProps();

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
    this.componentProps = { names, option, values };
    return Object.freeze({ ...values });
  }
  /**
   * @param { string } lifetime 生命周期名称
   * @param { () => void } listener 生命周期回调函数
   */
  addLifetimeListener(lifetime, listener) {
    this.check("add lifetime listeners");
    if (isFunction(listener)) {
      this.lifetimes[lifetime] = this.lifetimes[lifetime] || [];
      this.lifetimes[lifetime].push(listener);
    }
  }
  addObserver(scope, src, observer) {
    this.check("define observers");
    if (isFunction(observer)) {
      src = isNonEmptyString(src)
        ? src
        : isArray(src)
        ? src.filter(isNonEmptyString).join(",")
        : "";
      if (src) {
        this.componentObservers[src] = this.componentObservers[src] || [];
        if (scope) {
          const index = this.componentObservers[src].length;
          this.componentObservers[src].push(observer);
          return () => scope.removeObserver(src, index);
        }
      }
    }
    return () => false;
  }
  reset() {
    this.lifetimes = {};
    this.pageHooks = {};
    this.componentProps = [];
    this.componentObservers = {};
    this.setupReturns = {};
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
      } else {
        data[name] = property;
      }
    });
    return { data, methods };
  }
  bindSignalsAndMethods(instance) {
    this.isSetupIdle = true;
    let isSyncing = false;
    const signals = {};
    const unbinds = [];
    const methods = { ...this.pageHooks };
    const originSetData = instance.setData.bind(instance);
    const updateData = (key, val) => {
      isSyncing || originSetData({ [key]: val });
    };
    Object.entries(this.setupReturns).forEach(([name, property]) => {
      if (isFunction(property)) {
        if (isSignal(property)) {
          if (isWatchableSignal(property)) {
            signals[name] = property;
            unbinds.push(
              subscribeSignal(property, (val) => updateData(name, val.value))
            );
          }
        } else methods[name] = property;
      }
    });
    if (unbinds.length) {
      instance.setData = (data) => {
        if (data && typeof data === "object") {
          originSetData(data);
          isSyncing = true;
          Object.entries(data).forEach(
            ([key, val]) => signals[key] && updateSignal(signals[key], val)
          );
          isSyncing = false;
        }
      };
    }
    return { unbinds, methods };
  }
}
