import { isSignal, isSignalPayloadRef } from "../../state/index";
import {
  isFunction,
  isNonEmptyArray,
  isNonEmptyObject,
  isNonEmptyString,
  mergeArrayOrderByExists,
  mergeArrayOrderByNewCome,
} from "../../utils/index";
import {
  componentMountLifetimeNames,
  componentPageLifetimeNames,
} from "../etc/constants";
import { formatObserveSource } from "../etc/formatters";
import {
  createExportHandleCallingForwarder,
  createMethodInvokationForwarder,
  createDataChangeEventForwarder,
  createPropSyncingForwarder,
  createRelationEventForwarder,
} from "./calling-forwarding";
import SetupContext from "./SetupContext";

export default class extends SetupContext {
  defineOptions(options) {
    super.defineOptions(options);
    this.setupRecords.options = {
      ...this.setupRecords.options,
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
    this.setupRecords.extClasses = mergeArrayOrderByExists(
      this.setupRecords.extClasses,
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
    const { options: setupOptions, behaviorRefs } = this.setupRecords;
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
    this.assertIsActive("format options");
    const { externalClasses, export: optExport, ...formattedOptions } = options;
    const { relations, behaviorRefs, extClasses, exports } = this.setupRecords;
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
                  this.runtimeContext,
                  id,
                  eventname,
                  this.isPage
                );
              }
            });
          }
        });
      }
      if (isNonEmptyArray(extClasses)) {
        formattedOptions.externalClasses = mergeArrayOrderByExists(
          externalClasses,
          extClasses,
          isNonEmptyString
        );
      } else if (isNonEmptyArray(externalClasses)) {
        formattedOptions.externalClasses = externalClasses;
      }
      if (exports) {
        // 添加必要的行为 wx://component-export
        behaviorRefs.push("wx://component-export");
        formattedOptions.export = createExportHandleCallingForwarder(
          this.runtimeContext
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
    const { option } = this.setupRecords.props;
    return option || options.properties || {};
  }
  formatDataAndMethods(optData, optMethod) {
    // this.assertIsActive("format data and methods");
    const { runtimeContext, isPage } = this;
    const data = { ...optData };
    const methods = { ...optMethod };
    Object.entries(this.setupReturns).forEach(([name, item]) => {
      if (isFunction(item)) {
        if (isSignal(item, true)) {
          data[name] = item();
        } else {
          methods[name] = createMethodInvokationForwarder(
            runtimeContext,
            name,
            isPage
          );
        }
      } else if (isSignalPayloadRef(item)) {
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
    const { runtimeContext, setupLifetimes } = this;
    const lifetimes = { ...options.lifetimes };
    const pageLifetimes = { ...options.pageLifetimes };
    setupLifetimes.forEach((lifetime) => {
      if (componentMountLifetimeNames.includes(lifetime)) return;
      function lifetimehandle(...args) {
        runtimeContext
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
    const { runtimeContext, isPage, setupRecords } = this;
    const { observers: setupObservers, props } = setupRecords;
    const observers = { ...optObservers };
    Object.keys(setupObservers).forEach((src) => {
      observers[src] = createDataChangeEventForwarder(
        runtimeContext,
        src,
        isPage
      );
    });
    if (this.isComponent && props.names) {
      const propsWatcherSource = props.names.join(",");
      const sameSourceCallback = observers[propsWatcherSource];
      observers[propsWatcherSource] = createPropSyncingForwarder(
        runtimeContext,
        props.names,
        sameSourceCallback
      );
    }
    // this.setupRecords.observers = {};
    return observers;
  }
}
