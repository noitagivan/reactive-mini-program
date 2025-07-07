import { RefSignal } from "../state/consts";
import { useSignal } from "../state/index";
import { computed } from "../state/signals";
import { mergeCallbacks } from "../utils/index";

export default class InstanceScope {
  pageId = 0;
  isPage = false;
  isComponent = false;
  parentScope = null;
  effectScope = null;
  instance = null;

  setupProps = {
    defined: false,
    getter: null,
    setter: null,
    values: {},
  };
  setupRecords = {};
  lifetimes = {};
  observers = {};

  constructor(instance, configs = {}) {
    Object.assign(this, { ...configs, instance });
    if (this.isComponent) {
      const [getSetupProps, setSetupProps] = useSignal({});
      this.setupProps.getter = computed(() => getSetupProps());
      this.setupProps.setter = setSetupProps;
    }
  }
  run(fn, context) {
    try {
      context.setScope(this);
      this.effectScope.run(() => {
        const setupContext = fn();
        const { unbinds, methods } = setupContext.bindSignalsAndMethods(
          this.instance
        );
        this.setupRecords.unbind = mergeCallbacks(unbinds);
        this.setupRecords.methods = methods;
        this.setupRecords.lifetimes = setupContext.lifetimes || {};
        setupContext.reset();
      });
      context.resetScope(this);
      return this;
    } catch (error) {
      context.resetScope(this);
      throw error;
    }
  }
  stop() {
    // console.log("stop", this.effectScope, this.setupRecords.unbind);
    this.setupProps = {
      defined: false,
      getter: null,
      setter: null,
    };
    this.setupRecords.unbind?.();
    this.setupRecords = {};
    this.effectScope.stop();
    this.effectScope = null;
  }
  useDefaultProps(values) {
    if (values) {
      const { setter } = this.setupProps;
      setter?.((this.setupProps.values = values));
      this.setupProps.defined = true;
    }
    return this;
  }
  getPackagingProps() {
    const { getter } = this.setupProps;
    return new Proxy(this.setupProps.values, {
      get: (t, p, r) => (p === RefSignal ? getter : getter?.()?.[p]),
      set: (t, p, v, r) => false,
      deleteProperty: (t, p) => false,
    });
  }
  getSetupProps() {
    const { defined, getter } = this.setupProps;
    if (defined && getter) return getter();
    return null;
  }
  syncSetupProps(values) {
    const { defined, setter } = this.setupProps;
    if (defined && setter) {
      setter((this.setupProps.values = values));
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
  invokeLifeTimeCallback(lifetime, ...args) {
    this.lifetimes[lifetime]?.(...args);
  }
  invokeMethod(methodName, ...args) {
    return this.setupRecords.methods[methodName]?.call(this.instance, ...args);
  }
  invokeObserversCallback(src, ...args) {
    return this.observers[src]?.call(this.instance, ...args);
  }
  getId() {
    return this.isPage ? this.pageId : this.instance.__wxExparserNodeId__;
  }
}
