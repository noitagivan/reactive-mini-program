import { protectedObjectSignal } from "../state/ObjectSignal";
import {
  isSignal,
  isWatchable,
  subscribeStateOfSignal,
  isObjectSignal,
  computed,
} from "../state/index";
import { protectedSignal } from "../state/signal";
import { isFunction, isNonEmptyString, mergeCallbacks } from "../utils/index";
import SetupContex from "./SetupContex";
import { createDataBinder } from "./util";

export default class InstanceSetupContext extends SetupContex {
  setupProps = {
    defined: false,
    getter: null,
    setter: null,
    values: {},
  };
  lifetimes = new Map();
  providedData = new Map();
  methods = new Map();

  setProvidedData(scope, key, value) {
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
    // 为了保证 onMounted 生命周期能读到相对正确的值
    // 将绑定事件插入到 onBeforeMount
    const [signal, setter] = protectedSignal(defaultValue);
    if (isNonEmptyString(key) || isSymbol(key)) {
      scope.onBeforeMount(() => scope.bindParentProvidedData(key, setter));
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
    console.log("syncSetupProps", defined, values);
    if (defined && setter) {
      this.setupProps.values = values;
      setter(values);
    }
  }
  setLifeTimeCallback = (lifetime, ...optCbs) => {
    const {
      instance,
      lifetimes,
      setupRecords: { lifetimes: setupCbs },
    } = this;
    lifetimes.set(
      lifetime,
      mergeCallbacks(
        [...(setupCbs[lifetime] || []), ...optCbs].flat(),
        instance
      )
    );
    delete setupCbs[lifetime];
    return lifetimes.get(lifetime);
  };

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
  invokeLifeTimeCallback(lifetime, ...args) {
    this.lifetimes.get(lifetime)?.(...args);
    return this;
  }
  invokeObservers(src, ...values) {
    mergeCallbacks(this.setupRecords.componentObservers?.[src]).call(
      this.instance,
      ...values
    );
    return this;
  }
  invokeMethod(methodName, ...args) {
    return this.methods?.get(methodName)?.call(this.instance, ...args);
  }
  reset(configs = {}) {
    this.lifetimes.clear();
    this.providedData.clear();
    this.methods.clear();
    super.reset(configs);
  }
}
