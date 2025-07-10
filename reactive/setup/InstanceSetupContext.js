import { protectedObjectSignal } from "../state/ObjectSignal";
import {
  isSignal,
  isWatchable,
  subscribeSignal,
  isNestedObjectSignal,
  isObjectSignal,
  isValueRefSignal,
} from "../state/index";
import { emitSignal, useSignal } from "../state/signal";
import { isFunction, mergeCallbacks } from "../utils/index";
import SetupContex from "./SetupContex";

export default class InstanceSetupContext extends SetupContex {
  setupProps = {
    defined: false,
    getter: null,
    setter: null,
    values: {},
  };
  lifetimes = {};
  methods = {};

  getPackagedProps() {
    const {
      setupProps,
      setupProps: { values },
    } = this;
    const [siganl, getter, setter] = protectedObjectSignal(values);
    // const [getSetupProps, setSetupProps] = protect(values);
    setupProps.getter = getter;
    setupProps.setter = setter;
    setupProps.defined = true;
    return siganl;
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
    const { instance, setupRecords } = this;
    const signals = {};
    const unbinds = [];
    const methods = { ...setupRecords.pageHooks };
    const originSetData = instance.setData.bind(instance);
    const updateData = (key, val) => {
      isSyncing || originSetData({ [key]: val });
    };
    const bind = (name, signal) => {
      signals[name] = useSignal(signal);
      unbinds.push(
        subscribeSignal(signal, (val) =>
          updateData(
            name,
            isValueRefSignal(signal) ? val.value.value : val.value
          )
        )
      );
    };
    Object.entries(this.setupReturns).forEach(([name, property]) => {
      if (isFunction(property)) {
        if (isSignal(property)) {
          if (isWatchable(property)) bind(name, property);
        } else methods[name] = property;
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
    this.methods = methods;
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
    return this.methods?.[methodName]?.call(this.instance, ...args);
  }
}
