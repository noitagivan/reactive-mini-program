import {
  isSignal,
  isWatchableSignal,
  subscribeSignal,
  updateSignal,
} from "../state/signals";
import {
  isConstructor,
  isFunction,
  isNonEmptyString,
  isNonNullObject,
  onceInvokable,
} from "../utils/index";
import { invokeDefinedComponentMethod, invokeDefinedPageMethod } from "./setup";

export default class SetupContex {
  isPage = false;
  isComponent = false;
  lifetimes = {};
  pageHooks = {};
  componentProps = {};
  componentObservers = [];
  setupReturns = {};

  constructor(configs = {}) {
    Object.assign(this, configs);
    this.addLifetimeListener = this.addLifetimeListener.bind(this);
    this.setPageHook = this.setPageHook.bind(this);
  }
  exposeContext(scope) {
    const ctx = {
      instance: scope?.instance || null,
      isSettingUpInstanceOptions: !scope?.instance,
      isSettingUpInstanceInstance: !!scope?.instance,
      isPage: this.isPage,
      isComponent: this.isComponent,
    };
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
      definers.plainProps = () => scope?.getSetupProps() || {};
    }
    return Object.freeze(definers);
  }
  defineProps(scope, definations) {
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
    if (isFunction(listener)) {
      this.lifetimes[lifetime] = this.lifetimes[lifetime] || [];
      this.lifetimes[lifetime].push(listener);
    }
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
  reset() {
    this.lifetimes = {};
    this.pageHooks = {};
    this.componentProps = [];
    this.setupReturns = {};
  }
  initDataAndMethods(options) {
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
