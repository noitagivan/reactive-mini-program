import { isSignal, isValueRefSignal } from "../../state/index";
import {
  isFunction,
  isNonEmptyArray,
  isNonEmptyObject,
  isNonEmptyString,
} from "../../utils/index";
import SetupContext from "./SetupContext";
import {
  componentCoreLifetimeNames,
  componentPageLifetimeNames,
  formatObserveSource,
} from "../common/index";
import {
  mergeArrayOrderByExists,
  mergeArrayOrderByNewCome,
} from "../../utils/arr";
import {
  createExportHandlerCallingForwarder,
  createMethodCallingForwarder,
  createObserverInvokationForwarder,
  createPropsObserverInvokationForwarder,
} from "./calling-forwarding";

export default class extends SetupContext {
  defineOptions(options) {
    super.defineOptions(options);
    this.setupRecords.setupOptions = {
      ...this.setupRecords.setupOptions,
      options,
    };
  }
  defineRelation(id, description) {
    super.defineRelation(id, description);
  }
  mixInBehaviors(behaviors, ...more) {
    behaviors = [behaviors, ...more].flat();
    super.mixInBehaviors(behaviors);
    this.setupRecords.behaviorRefs = mergeArrayOrderByNewCome(
      this.setupRecords.behaviorRefs,
      behaviors,
      isNonEmptyString
    );
  }

  addExternalClasses(attrNames, ...more) {
    attrNames = [attrNames, ...more].flat();
    super.mixInBehaviors(attrNames);
    this.setupRecords.classAttrs = mergeArrayOrderByExists(
      this.setupRecords.classAttrs,
      attrNames,
      isNonEmptyString
    );
  }
  defineProperties(definations) {
    return Object.freeze({ ...super.defineProperties(definations) });
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

  formatOptions(options) {
    const {
      options: optOptions,
      behaviors,
      externalClasses,
      export: optExport,
      ...formattedOptions
    } = options;
    const { setupOptions, behaviorRefs, classAttrs, exports } =
      this.setupRecords;
    if (isNonEmptyObject(setupOptions)) {
      formattedOptions.options = { ...optOptions, ...setupOptions };
    } else if (isNonEmptyObject(optOptions)) {
      formattedOptions.options = optOptions;
    }
    if (this.isComponent) {
      if (isNonEmptyArray(classAttrs)) {
        formattedOptions.externalClasses = mergeArrayOrderByExists(
          externalClasses,
          classAttrs,
          isNonEmptyString
        );
      } else if (isNonEmptyArray(externalClasses)) {
        formattedOptions.externalClasses = externalClasses;
      }
      if (exports) {
        // 添加必要的行为 wx://component-export
        behaviorRefs.push("wx://component-export");
        formattedOptions.export = createExportHandlerCallingForwarder(
          this.runtime
        );
      } else if (isFunction(optExport)) {
        behaviorRefs.push("wx://component-export");
        formattedOptions.export = optExport;
      }
    }
    if (isNonEmptyArray(behaviorRefs)) {
      formattedOptions.behaviors = mergeArrayOrderByNewCome(
        behaviors,
        behaviorRefs,
        isNonEmptyString
      );
    } else if (isNonEmptyArray(behaviors)) {
      formattedOptions.behaviors = behaviors;
    }
    return formattedOptions;
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
    Object.entries(this.setupReturns).forEach(([name, property]) => {
      if (isFunction(property)) {
        if (isSignal(property)) {
          data[name] = property();
        } else {
          methods[name] = createMethodCallingForwarder(runtime, name, isPage);
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
          ?.context.forwardLifeTimeEvent(lifetime, ...args);
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
    Object.keys(setupObservers).forEach((src) => {
      observers[src] = createObserverInvokationForwarder(runtime, src, isPage);
    });
    if (this.isComponent && props.propNames) {
      const propsWatcherSource = props.propNames.join(",");
      const sameSourceCallback = observers[propsWatcherSource];
      observers[propsWatcherSource] = createPropsObserverInvokationForwarder(
        runtime,
        props.propNames,
        sameSourceCallback
      );
    }
    // this.setupRecords.observers = {};
    return observers;
  }
}
