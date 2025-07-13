import { useSignal } from "../../state/signal";
import {
  isConstructor,
  isFunction,
  isNonEmptyString,
  isNonNullObject,
  isPlainObject,
} from "../../utils/index";
import {
  componentLifetimeNames,
  componentPageLifetimeNames,
  pageLifetimeMap,
  relationTypes,
} from "../common/index";

export default class {
  runtime = null;
  instance = null;
  isPage = false;
  isComponent = false;
  setupRecords = {
    setupOptions: undefined,
    exports: null,
    behaviorRefs: [],
    classAttrs: [],
    componentProps: {},
    observers: {},
    relations: new Map(),
  };
  setupLifeTimes = [];
  setupReturns = {};

  get isSetupIdle() {
    return !this.runtime?.getSetupContext();
  }

  constructor(configs = {}) {
    Object.assign(this, configs);
  }
  checkIsNotIdle(action) {
    if (this.isSetupIdle)
      throw new Error(`cannot ${action} without setup context`);
  }
  checkIsType(type, action) {
    if (!this[`is${type}`])
      throw new Error(`cannot ${action} in Non-${type} setup context`);
  }

  /**
   * @param { string } lifetime 生命周期名称
   * @param { () => void } handle 生命周期回调函数
   */
  addLifetimeListener(scope, lifetime, handle) {
    this.checkIsNotIdle("add lifetime listeners");
    if (isFunction(handle)) {
      if (this.isPage && pageLifetimeMap[lifetime]) {
        this.setupLifeTimes.push(lifetime);
        return true;
      }
      if (
        this.isComponent &&
        (componentLifetimeNames.includes(lifetime) ||
          componentPageLifetimeNames.includes(lifetime))
      ) {
        this.setupLifeTimes.push(lifetime);
        return true;
      }
    }
    return false;
  }
  addPageEventListener(scope, eventname, handle) {
    this.checkIsNotIdle("add page event listeners");
    return false;
  }
  addCustomPageEventListener(scope, eventname, handle, once = false) {
    this.checkIsNotIdle("add custom page event listeners");
    return false;
  }

  defineOptions(options) {
    this.checkIsNotIdle("define options");
  }
  defineRelation(id, description) {
    this.checkIsNotIdle("define relations");
    const { type, target, linked, unlinked, linkChanged } = description;
    if (relationTypes.includes(type)) {
      if (isNonEmptyString(target)) {
        this.setupRecords.relations.set(id, {
          type,
          target,
        });
      } else {
        this.setupRecords.relations.set(id, {
          type,
          handlers: { linked, unlinked, linkChanged },
        });
      }
    }
  }
  mixInBehaviors(behaviors, ...more) {
    this.checkIsNotIdle("mix behaviors");
  }
  setProvidedData(scope, key, data) {
    this.checkIsNotIdle("provide data");
    return false;
  }

  getSetupProps() {
    return Object.freeze({
      ...(this.setupRecords.componentProps.values || {}),
    });
  }

  addExternalClasses(attrNames, ...more) {
    this.checkIsNotIdle("add external classes");
    this.checkIsType("Component", "add external classes");
  }
  defineProperties(definations) {
    this.checkIsNotIdle("define properties");
    this.checkIsType("Component", "define properties");
    if (isNonNullObject(definations) === false)
      throw new Error("properties must be a non-null object");

    const names = [],
      option = {},
      values = {};
    Object.entries(definations).forEach(([name, property]) => {
      if (isNonNullObject(property)) values[name] = property.value;
      else if (isConstructor(property)) {
        try {
          values[name] = property();
        } catch (error) {
          console.error(`init property ${name} error`);
          values[name] = undefined;
        }
      } else return;
      option[name] = property;
      names.push(name);
    });
    this.setupRecords.componentProps = { names, option, values };
    return values;
  }
  injectProvidedData(scope, key, defaultValue) {
    this.checkIsNotIdle("inject provided data");
    this.checkIsType("Component", "define properties");
    const [signal] = useSignal(defaultValue);
    return signal;
  }
  defineExportObject(exports) {
    this.checkIsNotIdle("set export object");
    this.checkIsType("Component", "set export object");
    if (isFunction(exports) || isPlainObject(exports)) {
      this.setupRecords.exports = exports;
    }
  }
  addDataAndSignalObserver(scope, src, observer) {
    this.checkIsNotIdle("observe data or signals");
    return () => false;
  }
  subscribePageProvidedDataReady(scope, handle) {
    this.checkIsNotIdle("add page data provide listen");
    this.checkIsType("Component", "add page data provide listen");
    return true;
  }

  inactive() {
    if (this.runtime?.getSetupContext() === this) {
      this.runtime.setSetupContext(null);
    }
    return this;
  }
  reactive() {
    this.runtime?.setSetupContext(this);
    return this;
  }
  reset(configs = {}) {
    const { relations } = this.setupRecords;
    this.inactive();
    relations.clear();
    this.isPage = false;
    this.isComponent = false;
    this.setupRecords = {
      relations,
      setupOptions: undefined,
      exportObj: null,
      behaviorRefs: [],
      classAttrs: [],
      componentProps: {},
      observers: {},
    };
    this.setupLifeTimes = [];
    this.setupReturns = {};
    this.instance = null;
    return Object.assign(this, configs);
  }
}
