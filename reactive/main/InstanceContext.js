import { protectedObject } from "../state/excel";
import { isSignal, isWatchable, subscribeSignal } from "../state/index";
import { isFunction, mergeCallbacks } from "../utils/index";
import SetupContex from "./SetupContex";

export default class InstanceContext extends SetupContex {
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
    const [siganl, getter, setter] = protectedObject(values);
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
    Object.entries(this.setupReturns).forEach(([name, property]) => {
      if (isFunction(property)) {
        if (isSignal(property)) {
          if (isWatchable(property)) {
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
