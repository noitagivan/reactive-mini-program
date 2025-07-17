import { isSignal, isValueRefSignal } from "../../state/index";
import {
  isFunction,
  isNonEmptyArray,
  isNonEmptyObject,
  isNonEmptyString,
  mergeArrayOrderByExists,
  mergeArrayOrderByNewCome,
} from "../../utils/index";

import {
  componentUnmountedLifetimeNames,
  componentPageLifetimeNames,
  formatObserveSource,
} from "../etc/index";
import {
  createExportHandlerCallingForwarder,
  createMethodCallingForwarder,
  createObserverInvokationForwarder,
  createPropsObserverInvokationForwarder,
  createRelationEventForwarder,
} from "./calling-forwarding";
import SetupContext from "./SetupContext";

export default class extends SetupContext {
  defineOptions(options) {
    super.defineOptions(options);
    this.setupRecords.setupOptions = {
      ...this.setupRecords.setupOptions,
      options,
    };
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

  addExternalClasses(attrs, ...more) {
    attrs = [attrs, ...more].flat();
    super.mixInBehaviors(attrs);
    this.setupRecords.classAttrs = mergeArrayOrderByExists(
      this.setupRecords.classAttrs,
      attrs,
      isNonEmptyString
    );
  }
  defineProperties(definations) {
    return Object.freeze({ ...super.defineProperties(definations) });
  }
  addMixedObserver(scope, src, callback) {
    super.addMixedObserver(scope, src, callback);
    if (isFunction(callback)) {
      const { observers } = this.setupRecords;
      const { key } = formatObserveSource(src, scope);
      if (key) observers[key] = observers[key] || [];
    }
    return () => false;
  }

  formatCommonOptions(options) {
    const { options: optOptions, behaviors, ...formattedOptions } = options;
    const { setupOptions, behaviorRefs } = this.setupRecords;
    if (isNonEmptyObject(setupOptions)) {
      formattedOptions.options = { ...optOptions, ...setupOptions };
    } else if (isNonEmptyObject(optOptions)) {
      formattedOptions.options = optOptions;
    }
    if (isNonEmptyArray(behaviorRefs)) {
      formattedOptions.behaviors = mergeArrayOrderByNewCome(
        behaviors,
        behaviorRefs,
        isNonEmptyString
      );
    } else if (isNonEmptyArray(behaviors)) {
      formattedOptions.behaviors = behaviors;
    } else {
      formattedOptions.behaviors = [];
    }
    return formattedOptions;
  }
  formatOptions(options) {
    const { externalClasses, export: optExport, ...formattedOptions } = options;
    const { relations, behaviorRefs, classAttrs, exports } = this.setupRecords;
    if (this.isComponent) {
      if (isNonEmptyObject(relations)) {
        options.relations = { ...options.relations };
        Object.entries(relations).forEach(([id, desc]) => {
          const { type, target, handler } = desc;
          if (target) {
            options.relations[id] = desc;
          } else {
            const _desc = { type };
            Object.entries(handler).forEach(([eventname, handle]) => {
              if (isFunction(handle)) {
                _desc[eventname] = createRelationEventForwarder(
                  this.runtime,
                  id,
                  eventname,
                  this.isPage
                );
              }
            });
          }
        });
      }
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
    return this.formatCommonOptions(formattedOptions);
  }
  createPropertiesOption(options) {
    // this.assertIsActive("create properties option");
    const { option } = this.setupRecords.componentProps;
    return option || options.properties || {};
  }
  formatDataAndMethods(optData, optMethod) {
    // this.assertIsActive("create data and methods option");
    const { runtime, isPage } = this;
    const data = { ...optData };
    const methods = { ...optMethod };
    Object.entries(this.setupReturns).forEach(([name, item]) => {
      if (isFunction(item)) {
        if (isSignal(item)) {
          data[name] = item();
        } else {
          methods[name] = createMethodCallingForwarder(runtime, name, isPage);
        }
      } else if (isValueRefSignal(item)) {
        data[name] = item.value;
      } else {
        data[name] = item;
      }
    });
    // this.setupReturns = {};
    return { data, methods };
  }
  createLifetimeOptions(options) {
    // this.assertIsActive("create lifetime option");
    const { runtime, setupLifetimes } = this;
    const lifetimes = { ...options.lifetimes };
    const pageLifetimes = { ...options.pageLifetimes };
    setupLifetimes.forEach((lifetime) => {
      if (componentUnmountedLifetimeNames.includes(lifetime)) return;
      function lifetimehandle(...args) {
        runtime
          .getComponentScope(this)
          ?.forwardInstanceLifetimeEvent(lifetime, ...args);
      }
      if (componentPageLifetimeNames.includes(lifetime)) {
        pageLifetimes[lifetime] = lifetimehandle;
      } else {
        lifetimes[lifetime] = lifetimehandle;
      }
    });
    // this.setupLifetimes = [];
    return { lifetimes, pageLifetimes };
  }
  createObserversOption(optObservers = {}) {
    // this.assertIsActive("create observers option");
    const { runtime, isPage, setupRecords } = this;
    const { observers: setupObservers, componentProps: props } = setupRecords;
    const observers = { ...optObservers };
    Object.keys(setupObservers).forEach((src) => {
      observers[src] = createObserverInvokationForwarder(runtime, src, isPage);
    });
    if (this.isComponent && props.names) {
      const propsWatcherSource = props.names.join(",");
      const sameSourceCallback = observers[propsWatcherSource];
      observers[propsWatcherSource] = createPropsObserverInvokationForwarder(
        runtime,
        props.names,
        sameSourceCallback
      );
    }
    // this.setupRecords.observers = {};
    return observers;
  }
}
