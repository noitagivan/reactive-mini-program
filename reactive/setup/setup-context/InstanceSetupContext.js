import { protectedObjectSignal } from "../../state/ObjectSignal";
import {
  isSignal,
  isWatchable,
  subscribeStateOfSignal,
  isObjectSignal,
  computed,
} from "../../state/index";
import { protectedSignal } from "../../state/signal";
import { EventBus, isFunction, isNonEmptyString } from "../../utils/index";
import SetupContex from "./SetupContext";
import {
  createDataBinder,
  createMixObserver,
  formatObserveSource,
  pageEventNames,
  pageLifetimeMap,
} from "../util";

const crossComponentEventBus = new EventBus();

export default class extends SetupContex {
  static invokeDefinedPageMethod(runtime, page, methodName, args) {
    return runtime
      .getPageScope(page.getPageId())
      ?.context.invokeSetupMethod(methodName, ...args);
  }
  static invokeDefinedComponentMethod(runtime, component, methodName, args) {
    return runtime
      .getComponentScope(component)
      ?.context.invokeSetupMethod(methodName, ...args);
  }
  static invokeDefinedPageDataObserver(runtime, page, src, values) {
    runtime
      .getPageScope(page.getPageId())
      ?.context.distributeDataChangeEvent(src, ...values);
  }
  static invokeDefinedComponentDataObserver(runtime, component, src, values) {
    runtime
      .getComponentScope(component)
      ?.context.distributeDataChangeEvent(src, ...values);
  }
  static syncSetupProps(runtime, component, propNames, values) {
    runtime
      .getComponentScope(component)
      ?.context.syncSetupProps(
        Object.fromEntries(propNames.map((prop, i) => [prop, values[i]]))
      );
  }

  eventBus = new EventBus();
  setupProps = {
    defined: false,
    getter: null,
    setter: null,
    values: {},
  };
  setupPageEvents = [];
  providedData = new Map();
  methods = new Map();

  getPackagedProps() {
    const {
      setupProps,
      setupProps: { values },
    } = this;
    const [signal, getter, setter] = protectedObjectSignal(values);
    // const [getSetupProps, setSetupProps] = protect(values);
    setupProps.getter = getter;
    setupProps.setter = setter;
    setupProps.defined = true;
    return signal;
  }
  getSetupProps() {
    const { defined, getter } = this.setupProps;
    if (defined && getter) return getter();
    return null;
  }
  syncSetupProps(values) {
    const { defined, setter } = this.setupProps;
    if (defined && setter) {
      this.setupProps.values = values;
      setter(values);
    }
  }

  setProvidedData(scope, key, value) {
    super.setProvidedData(scope, key, value);
    if (this.providedData && (isNonEmptyString(key) || isSymbol(key))) {
      if (isFunction(value)) {
        value = computed(value);
      }
      this.providedData.set(key, { value });
      if (this.isPage) {
        if (isWatchable(value)) {
          subscribeStateOfSignal(value, (payload) =>
            scope.broadcastPageProvidedData(key, payload.value)
          );
          scope.broadcastPageProvidedData(key, value());
        } else {
          scope.broadcastPageProvidedData(key, value);
        }
      }
      return true;
    }
    return false;
  }
  injectProvidedData(scope, key, defaultValue) {
    // inject 阶段组件尚未 attach, 并不知道 parentScope
    // 只能先创建对应的 signal, 然后在 attached 后再绑定
    // 为了保证 mounted 生命周期能读到相对正确的值
    // 将绑定任务插入到 instanceScope 的 beforemount 生命周期
    const [signal, setter] = protectedSignal(
      super.injectProvidedData(scope, key, defaultValue)
    );
    if (isNonEmptyString(key) || isSymbol(key)) {
      scope.addLifeTimeListener("beforemount", () =>
        scope.bindParentProvidedData(key, setter)
      );
    }
    return signal;
  }
  getProvidedData(scope, key) {
    // 此方法被调用，说明组件是 attached 状态，
    // 因为只有 attached 时父子 Scope 的关系才明确
    const { isPage, providedData } = this;
    if (providedData?.has(key)) return providedData.get(key);
    if (isPage) return false;
    if (scope.parentScope) {
      return scope.parentScope.context.getProvidedData(key);
    }
    return this.getPageProvidedData(scope, key);
  }
  getPageProvidedData(scope, key) {
    const { runtime, isPage } = this;
    if (isPage) return false;
    const pageIntanceScope = runtime.getPageScope(scope.pageId);
    if (pageIntanceScope) {
      scope.parentScope = pageIntanceScope;
      return pageIntanceScope.context.getProvidedData(key);
    }
    return null;
  }

  addLifetimeListener(lifetime, listener) {
    if (super.addLifetimeListener(lifetime, listener)) {
      this.eventBus.on(`lifetimes/${lifetime}`, ({ payload }) =>
        listener.call(this.instance, ...payload)
      );
      return true;
    }
    return false;
  }
  addPageEventListener(scope, eventname, listener) {
    super.addPageEventListener(scope, eventname, listener);
    if (pageEventNames.includes(eventname) && isFunction(handler)) {
      const { instance, pageId, setupPageEvents } = this;
      if (!setupPageEvents.includes(eventname)) setupPageEvents.push(eventname);
      scope.addLifeTimeListener(
        "dispose",
        crossComponentEventBus.on(
          `${pageId}/events/${eventname}`,
          ({ payload }) => listener.call(instance, ...payload)
        )
      );
    }
  }
  addDataAndSignalObserver(scope, src, observer) {
    super.addDataAndSignalObserver(scope, src, observer);
    if (isFunction(observer)) {
      const { key, signals, indexesMap } = formatObserveSource(src, scope);
      if (key) {
        if (signals.length) {
          // 组合字符串和signals的
          // 难点在于回调值的按序合并
          return createMixObserver(src, observer, {
            instance: this,
            key,
            signals,
            indexesMap,
          });
        }
        return () => this.eventBus.on(`datachange/${key}`, observer);
      }
      if (signals.length) return watch(signals, observer).stop;
    }
    return () => false;
  }

  createPageInstanceLifeTimeHandles(_, options) {
    const { instance, setupLifeTimes } = this;
    setupLifeTimes.forEach((lifetime) => {
      const [handleName, replace] = pageLifetimeMap[lifetime];
      this.addLifetimeListener(lifetime, options[handleName]);
      if (replace) {
        instance[handleName] = this.distributeLifeTimeEvent.bind(
          this,
          lifetime
        );
      }
    });
  }
  createPageInstanceHookHandle(scope, options) {
    const { instance, setupPageEvents } = this;
    setupPageEvents.forEach((eventname) => {
      this.addPageEventListener(scope, eventname, options[eventname]);
      instance[`on${eventname}`] = this.invokeSetupPageEvent.bind(
        this,
        eventname
      );
    });
  }
  bindSignalsAndMethods() {
    this.isSetupIdle = true;
    const { instance, setupReturns, methods } = this;

    const { setData, bind, unbinds } = createDataBinder(instance);
    Object.entries(setupReturns).forEach(([name, property]) => {
      if (isFunction(property)) {
        if (isSignal(property)) {
          if (isWatchable(property)) bind(name, property);
        } else methods?.set(name, property);
      } else if (isObjectSignal(property)) bind(name, property);
    });
    if (unbinds.length) {
      instance.setData = setData;
    }
    return unbinds;
  }

  distributeLifeTimeEvent(lifetime, ...payload) {
    this.eventBus.emit(`lifetimes/${lifetime}`, payload);
    return this;
  }
  invokeSetupPageEvent(eventname, ...payload) {
    crossComponentEventBus.emit(`${this.pageId}/events/${eventname}`, payload);
    return this;
  }
  distributeDataChangeEvent(src, ...values) {
    this.eventBus.emit(`datachange/${src}`, values);
    return this;
  }
  invokeSetupMethod(methodName, ...args) {
    return this.methods?.get(methodName)?.call(this.instance, ...args);
  }
  reset(configs = {}) {
    this.setupProps = {
      defined: false,
      getter: null,
      setter: null,
      values: {},
    };
    this.setupPageEvents = [];
    this.eventBus.clear();
    this.providedData.clear();
    this.methods.clear();
    super.reset(configs);
  }
}
