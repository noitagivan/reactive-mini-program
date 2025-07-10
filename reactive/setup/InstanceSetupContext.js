import { protectedObjectSignal } from "../state/ObjectSignal";
import {
  isSignal,
  isWatchable,
  subscribeSignal,
  isNestedObjectSignal,
  isObjectSignal,
  isValueRefSignal,
  computed,
} from "../state/index";
import { emitSignal, protectedSignal, useSignal } from "../state/signal";
import { isFunction, isNonEmptyString, mergeCallbacks } from "../utils/index";
import SetupContex from "./SetupContex";

export default class InstanceSetupContext extends SetupContex {
  setupProps = {
    defined: false,
    getter: null,
    setter: null,
    values: {},
  };
  lifetimes = {};
  providedData = new Map();
  methods = new Map();

  setProvidedData(scope, key, value) {
    if (this.providedData && (isNonEmptyString(key) || isSymbol(key))) {
      if (isFunction(value)) {
        value = computed(value);
      }
      this.providedData?.set(key, { value });
      if (this.isPage) {
        if (isWatchable(value)) {
          subscribeSignal(value, (payload) =>
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
    console.log("injectProvidedData", key, defaultValue, scope.parentScope);
    const [signal, setter] = protectedSignal(defaultValue);
    if (isNonEmptyString(key) || isSymbol(key)) {
      scope.onBeforeMount(() => scope.bindParentProvidedData(key, setter));
    }
    return signal;
  }
  getProvidedData(key) {
    // 此方法被调用，说明组件是 attached 状态，
    // 因为只有 attached 时父子 Scope 的关系才明确
    const { runtime, instance, isPage } = this;
    if (this.providedData?.has(key)) {
      return this.providedData.get(key);
    }
    if (isPage) return false;
    const scope = runtime.getComponentScope(instance);
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
    lifetimes[lifetime] = mergeCallbacks(
      [...(setupCbs[lifetime] || []), ...optCbs].flat(),
      instance
    );
    delete setupCbs[lifetime];
    return lifetimes[lifetime];
  };

  bindSignalsAndMethods() {
    /**
     * TODO
     * 由于小程序提供的 setData 粒度很细，所以这里建议使用 observer 来维护data和signal的数据同步
     * 如维护 props 状态同步一样
     * 而且，可以相比于劫持 setData ，使用 observer 似乎更安全
     */
    this.isSetupIdle = true;
    let isSyncing = false;
    const { instance, setupReturns, methods } = this;
    const signals = {};
    const unbinds = [];
    const originSetData = instance.setData.bind(instance);
    const updateData = (key, val) => {
      isSyncing || originSetData({ [key]: val });
    };
    const bind = (name, signal) => {
      signals[name] = useSignal(signal);
      unbinds.push(
        subscribeSignal(signal, (payload) =>
          updateData(
            name,
            isValueRefSignal(signal) ? payload.value.value : payload.value
          )
        )
      );
    };
    Object.entries(setupReturns).forEach(([name, property]) => {
      if (isFunction(property)) {
        if (isSignal(property)) {
          if (isWatchable(property)) bind(name, property);
        } else methods?.set(name, property);
      } else if (isObjectSignal(property)) bind(name, property);
    });
    if (unbinds.length) {
      instance.setData = (data) => {
        if (data && typeof data === "object") {
          originSetData(data);
          isSyncing = true;
          Object.entries(data).forEach(([key, val]) => {
            if (signals[key]) {
              if (isValueRefSignal(signals[key])) signals[key].value = val;
              else if (isNestedObjectSignal(signals[key]))
                Object.assign(signals[key], val);
              else emitSignal(signals[key], val);
            }
            if (signals[key]) {
              emitSignal(signals[key], val);
            } else if (signals[key]) {
              emitSignal(signals[key], val);
            }
          });
          isSyncing = false;
        }
      };
    }
    return unbinds;
  }
  invokeLifeTimeCallback(lifetime, ...args) {
    this.lifetimes[lifetime]?.(...args);
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
    this.lifetimes = {};
    this.providedData.clear();
    this.methods.clear();
    super.reset(configs);
  }
}
