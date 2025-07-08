import { RefSignal } from "../state/consts";
import { useSignal } from "../state/index";
import { computed } from "../state/signals";
import { isFunction, mergeCallbacks } from "../utils/index";
export default class InstanceScope {
  pageId = 0;
  isPage = false;
  isComponent = false;
  parentScope = null;
  effectScope = null;
  instance = null;

  callbacks = {
    attach: [],
    dispose: [],
  };

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
        this.setupRecords.lifetimes = setupContext.lifetimes;
        setupContext.reset();
      });
      context.resetScope(this);
      return this;
    } catch (error) {
      context.resetScope(this);
      throw error;
    }
  }
  attachTo(parentScope) {
    const { attach } = this.callbacks;
    if (parentScope) {
      this.parentScope = parentScope;
    }
    mergeCallbacks(attach)();
    delete this.callbacks.attach;
    return this;
  }
  onAttached(cb) {
    const { attach } = this.callbacks;
    if (isFunction(cb)) attach.push(cb);
  }
  offAttached(cb) {
    const { attach } = this.callbacks;
    this.callbacks.attach = attach.filter((fn) => fn !== cb);
  }
  onDispose(cb) {
    const { dispose } = this.callbacks;
    dispose.push(cb);
  }
  offDispose(cb) {
    const { dispose } = this.callbacks;
    this.callbacks.dispose = dispose.filter((fn) => fn !== cb);
  }
  stop() {
    // console.log("stop", this.effectScope, this.setupRecords.unbind);
    mergeCallbacks(this.callbacks.dispose)();
    this.setupProps = {
      defined: false,
      getter: null,
      setter: null,
    };
    this.callbacks = {};
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
    return this;
  }
  invokeMethod(methodName, ...args) {
    return this.setupRecords.methods[methodName]?.call(this.instance, ...args);
  }
  invokeObserversCallback(src, ...args) {
    this.observers[src]?.call(this.instance, ...args);
    return this;
  }
  getId() {
    return this.isPage ? this.pageId : this.instance.__wxExparserNodeId__;
  }
}
