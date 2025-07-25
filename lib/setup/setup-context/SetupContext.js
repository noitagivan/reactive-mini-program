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
} from "../etc/constants";

export default class {
  runtimeContext = null;
  #instance = null;
  isPage = false;
  isComponent = false;
  setupRecords = {
    options: undefined,
    exports: null,
    behaviorRefs: [],
    extClasses: [],
    props: {},
    observers: {},
    relations: new Map(),
  };
  setupLifetimes = [];
  setupReturns = {};

  get isSetupIdle() {
    return !this.runtimeContext?.getSetupContext();
  }
  get instance() {
    return this.#instance?.deref();
  }

  constructor(configs = {}, instance) {
    Object.assign(this, configs);
    if (instance) this.#instance = new WeakRef(instance);
  }
  assertIsActive(action) {
    if (this.isSetupIdle)
      throw new Error(`cannot ${action} without setup context`);
  }
  assertIsOfType(type, action) {
    if (!this[`is${type}`])
      throw new Error(`cannot ${action} in Non-${type} setup context`);
  }

  addLifetimeListener(scope, lifetime, listener) {
    this.assertIsActive("add lifetime listeners");
    if (isFunction(listener)) {
      if (this.setupLifetimes.includes(lifetime)) return true;
      if (this.isPage && pageLifetimeMap[lifetime]) {
        this.setupLifetimes.push(lifetime);
        return true;
      }
      if (
        this.isComponent &&
        (componentLifetimeNames.includes(lifetime) ||
          componentPageLifetimeNames.includes(lifetime))
      ) {
        this.setupLifetimes.push(lifetime);
        return true;
      }
    }
    return false;
  }
  addPageEventHandle(scope, eventname, handle) {
    this.assertIsActive("add page event handle");
    return false;
  }

  defineOptions(options) {
    this.assertIsActive("define options");
  }
  defineRelation(id, description) {
    this.assertIsActive("define relations");
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
          handler: { linked, unlinked, linkChanged },
        });
      }
    }
  }
  mixInBehaviors(behaviors, ...more) {
    this.assertIsActive("mix in behaviors");
  }
  setProvidedData(scope, key, data) {
    this.assertIsActive("provide data");
    return false;
  }

  addExternalClasses(attrs, ...more) {
    this.assertIsActive("add external classes");
    this.assertIsOfType("Component", "add external classes");
  }
  defineProperties(definations) {
    this.assertIsActive("define properties");
    this.assertIsOfType("Component", "define properties");
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
    this.setupRecords.props = { names, option, values };
    return values;
  }
  injectProvidedData(scope, key, defaultValue) {
    this.assertIsActive("inject provided data");
    this.assertIsOfType("Component", "inject provided data");
    const [signal] = useSignal(defaultValue);
    return signal;
  }
  defineExportObject(exports) {
    this.assertIsActive("define export object");
    this.assertIsOfType("Component", "define export object");
    if (isFunction(exports) || isPlainObject(exports)) {
      this.setupRecords.exports = exports;
    }
  }
  addMixedObserver(scope, src, callback) {
    this.assertIsActive("observe data or signals");
    return () => false;
  }

  inactive() {
    if (this.runtimeContext?.getSetupContext() === this) {
      this.runtimeContext.setSetupContext(null);
    }
    return this;
  }
  reactive() {
    this.runtimeContext?.setSetupContext(this);
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
      options: undefined,
      exports: null,
      behaviorRefs: [],
      extClasses: [],
      props: {},
      observers: {},
    };
    this.setupLifetimes = [];
    this.setupReturns = {};
    this.#instance = null;
    return Object.assign(this, configs);
  }
}
