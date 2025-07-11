import { isSignal, isValueRefSignal } from "../state/index";
import { protectedSignal, watch } from "../state/signal";
import {
  isConstructor,
  isFunction,
  isNonEmptyString,
  isNonNullObject,
  onceInvokable,
} from "../utils/index";
import { formatObserveSource, createMixObserver } from "./util";

export default class SetupContex {
  runtime = null;
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
  exposeDefiners(scope) {
    const definers = {
      provide: this.setProvidedData.bind(this, scope),
    };
    if (this.isPage) {
    } else if (this.isComponent) {
      definers.defineProps = onceInvokable(
        this.defineProps.bind(this, scope),
        "cannot define properties more than once for a component"
      );
      definers.observe = this.addObserver.bind(this, scope);
      definers.inject = this.injectProvidedData.bind(this, scope);
    }
    return Object.freeze(definers);
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
      ctx.$props = scope
        ? () => ({ ...(scope.context.getSetupProps() || {}) })
        : () => ({});
    }
    this.isSetupIdle = false;
    return Object.freeze(ctx);
  }

  setProvidedData(scope, key, value) {}
  injectProvidedData(scope, key, defaultValue) {
    const [signal] = protectedSignal(defaultValue);
    return signal;
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
    if (isFunction(observer)) {
      const { componentObservers } = this.setupRecords;
      const { key, signals, indexesMap } = formatObserveSource(src, scope);
      if (key) componentObservers[key] = componentObservers[key] || [];
      if (scope) {
        if (key) {
          const index = componentObservers[key].length;
          if (signals.length) {
            // 组合字符串和signals的
            // 难点在于回调值的按序合并
            const { instanceDataObserver, unwatchSignals } = createMixObserver(
              src,
              observer,
              { scope, signals, indexesMap }
            );
            componentObservers[key].push(instanceDataObserver);
            return () => (
              unwatchSignals(), this.removeInstanceDataObserver(key, index)
            );
          }
          componentObservers[key].push(observer);
          return () => this.removeInstanceDataObserver(key, index);
        }
        if (signals.length) return watch(signals, observer).stop;
      }
    }
    return () => false;
  }
  removeInstanceDataObserver(src, index) {
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
          const runtime = this.runtime;
          if (this.isPage) {
            methods[name] = function (...args) {
              return invokeDefinedPageMethod(runtime, this, name, ...args);
            };
          } else if (this.isComponent) {
            methods[name] = function (...args) {
              return invokeDefinedComponentMethod(runtime, this, name, ...args);
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
      pageProvidedDataSignals: {},
      componentProps: {},
      componentObservers: {},
    };
    this.setupReturns = {};
    this.instance = null;
    return Object.assign(this, configs);
  }
}

function invokeDefinedPageMethod(runtime, instance, methodName, ...args) {
  const pageId = instance?.getPageId();
  if (pageId) {
    return runtime
      .getPageScope(pageId)
      ?.context.invokeMethod(methodName, ...args);
  }
}

function invokeDefinedComponentMethod(runtime, component, methodName, ...args) {
  return runtime
    .getComponentScope(component)
    ?.context.invokeMethod(methodName, ...args);
}
