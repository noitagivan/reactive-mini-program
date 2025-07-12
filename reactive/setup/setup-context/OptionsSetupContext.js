import { isSignal, isValueRefSignal } from "../../state/index";
import { isFunction } from "../../utils/index";
import InstanceSetupContext from "./InstanceSetupContext";
import SetupContext from "./SetupContext";
import {
  componentCoreLifetimeNames,
  componentPageLifetimeNames,
  formatObserveSource,
} from "../util";

export default class extends SetupContext {
  addDataAndSignalObserver(scope, src, observer) {
    super.addDataAndSignalObserver(scope, src, observer);
    if (isFunction(observer)) {
      const { observers } = this.setupRecords;
      const { key } = formatObserveSource(src, scope);
      if (key) observers[key] = observers[key] || [];
    }
    return () => false;
  }

  getPropertiesOption(options) {
    const { option, values } = this.setupRecords.componentProps;
    const properties = option || options.properties || {};
    return { properties, values };
  }
  getDataAndMethodsOptions(optData, optMethod) {
    this.isSetupIdle = true;
    const { runtime, isPage } = this;
    const data = { ...optData };
    const methods = { ...optMethod };
    const invoke = isPage
      ? InstanceSetupContext.invokeDefinedPageMethod
      : InstanceSetupContext.invokeDefinedComponentMethod;
    Object.entries(this.setupReturns).forEach(([name, property]) => {
      if (isFunction(property)) {
        if (isSignal(property)) {
          data[name] = property();
        } else {
          methods[name] = function (...args) {
            return invoke(runtime, this, name, args);
          };
        }
      } else if (isValueRefSignal(property)) {
        data[name] = property.value;
      } else {
        data[name] = property;
      }
    });
    return { data, methods };
  }
  getLifetimeOptions(options) {
    const { runtime, setupLifeTimes } = this;
    const lifetimes = { ...options.lifetimes };
    const pageLifetimes = { ...options.pageLifetimes };
    setupLifeTimes.forEach((lifetime) => {
      if (componentCoreLifetimeNames.includes(lifetime)) return;
      function lifetimehandle(...args) {
        // console.log(`lifetimes/${lifetime}`, this.__wxExparserNodeId__);
        runtime
          .getComponentScope(this)
          ?.context.distributeLifeTimeEvent(lifetime, ...args);
      }
      if (componentPageLifetimeNames.includes(lifetime)) {
        pageLifetimes[lifetime] = lifetimehandle;
      } else {
        lifetimes[lifetime] = lifetimehandle;
      }
    });
    return { lifetimes, pageLifetimes };
  }
  getObserversOption(optObservers) {
    const { runtime, isPage, setupRecords } = this;
    const { observers: setupObservers, componentProps: props } = setupRecords;
    const observers = { ...optObservers };
    const invoke = isPage
      ? InstanceSetupContext.invokeDefinedPageDataObserver
      : InstanceSetupContext.invokeDefinedComponentDataObserver;
    Object.keys(setupObservers).forEach((src) => {
      observers[src] = function (...values) {
        invoke(runtime, this, src, values);
        optObservers?.[src]?.call(this, ...values);
      };
    });
    if (this.isComponent && props.propNames) {
      const propsWatcherSource = props.propNames.join(",");
      const sameSourceCallback = observers[propsWatcherSource];
      observers[propsWatcherSource] = function (...values) {
        InstanceSetupContext.syncSetupProps(
          runtime,
          this,
          props.propNames,
          values
        );
        sameSourceCallback?.call(this, ...values);
      };
    }
    return observers;
  }
  reset(configs = {}) {
    this.isSetupIdle = true;
    this.isPage = false;
    this.isComponent = false;
    this.setupRecords = {
      componentProps: {},
      observers: {},
    };
    this.setupLifeTimes = [];
    this.setupReturns = {};
    this.instance = null;
    return Object.assign(this, configs);
  }
}
