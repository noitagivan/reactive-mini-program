import { isSignal, isValueRefSignal } from "../../state/index";
import { isFunction, isNonEmptyString } from "../../utils/index";
import InstanceSetupContext from "./InstanceSetupContext";
import SetupContext from "./SetupContext";
import {
  componentCoreLifetimeNames,
  componentPageLifetimeNames,
  formatObserveSource,
} from "../common";

export default class extends SetupContext {
  setConfigOptions(options) {
    super.setConfigOptions(options);
    this.setupRecords.options = {
      ...this.setupRecords.options,
      options,
    };
  }
  addBehaviors(behaviors, ...more) {
    const _behaviors = [behaviors, ...more].flat();
    super.addBehaviors(_behaviors);
    const $behaviors = this.setupRecords.behaviors.filter(
      (behavior) => !_behaviors.includes(behavior)
    );
    _behaviors.forEach(
      (behavior) => isNonEmptyString(behavior) && $behaviors.push(behavior)
    );
    this.setupRecords.behaviors = $behaviors;
  }
  addExternalClasses(attrNames, ...more) {
    const attrs = [attrNames, ...more].flat();
    super.addBehaviors(attrs);
    const { classAttrs } = this.setupRecords;
    attrs.forEach(
      (attr) =>
        isNonEmptyString(attr) &&
        !classAttrs.includes(attr) &&
        classAttrs.push(attr)
    );
  }
  setExportObject(object) {
    super.setExportObject(attrs);
    // 添加必要的行为 wx://component-export
    this.addBehaviors("wx://component-export");
  }
  addDataAndSignalObserver(scope, src, observer) {
    super.addDataAndSignalObserver(scope, src, observer);
    if (isFunction(observer)) {
      const { observers } = this.setupRecords;
      const { key } = formatObserveSource(src, scope);
      if (key) observers[key] = observers[key] || [];
    }
    return () => false;
  }

  createPropertiesOption(options) {
    // this.checkIsNotIdle("create properties option");
    const { option } = this.setupRecords.componentProps;
    return option || options.properties || {};
  }
  createDataAndMethodsOptions(optData, optMethod) {
    // this.checkIsNotIdle("create data and methods option");
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
    // this.setupReturns = {};
    return { data, methods };
  }
  createLifetimeOptions(options) {
    // this.checkIsNotIdle("create lifetime option");
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
    // this.setupLifeTimes = [];
    return { lifetimes, pageLifetimes };
  }
  createObserversOption(optObservers) {
    // this.checkIsNotIdle("create observers option");
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
    // this.setupRecords.observers = {};
    return observers;
  }
}
