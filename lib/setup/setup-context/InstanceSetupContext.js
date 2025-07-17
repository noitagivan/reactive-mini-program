import {
  computed,
  isSignalizedObject,
  isSignal,
  isWatchable,
  trackSignal,
  signalized,
  useSignal,
} from "../../state/index";
import { SignalizedObject } from "../../state/signalized-object/wrappers";
import { interpretSignal, protectSignal } from "../../state/signal";
import {
  EventBus,
  isFunction,
  isNonEmptyString,
  isPlainObject,
} from "../../utils/index";
import {
  componentLifetimeNames,
  componentPageLifetimeNames,
  createDataBinder,
  createMixedObserver,
  formatObserveSource,
  onceLifetimeNames,
  pageEventNames,
  pageLifetimeMap,
} from "../common/index";
import SetupContext from "./SetupContext";

class SetupProps extends SignalizedObject {}
const crossInstanceEventBus = new EventBus();
const crossInstancePageEvents = new Map();

export default class extends SetupContext {
  eventBus = new EventBus();
  setupProps = {
    defined: false,
    signal: null,
    assign: null,
  };
  providedData = new Map();
  injectedKeys = new Map();
  methods = new Map();
  relationLifetimeHandlers = new Map();

  addLifetimeListener(scope, lifetime, listener) {
    if (super.addLifetimeListener(scope, lifetime, listener)) {
      const listenType = onceLifetimeNames.includes("lifetime") ? "once" : "on";
      scope[listenType](`lifetimes/${lifetime}`, ({ payload }) =>
        listener.call(this.instance, ...payload)
      );
      return true;
    }
    return false;
  }
  addPageEventHandle(scope, eventname, handle) {
    super.addPageEventHandle(scope, eventname, handle);
    if (pageEventNames.includes(eventname) && isFunction(handle)) {
      const events = crossInstancePageEvents.get(scope.pageId) || [];
      if (!events?.includes(eventname)) events.push(eventname);
      crossInstancePageEvents.set(scope.pageId, events);
      scope.addLifetimeHandle(
        "dispose",
        crossInstanceEventBus.on(
          `${scope.pageId}/events/${eventname}`,
          ({ payload }) => handle.call(this.instance, ...payload)
        )
      );
      return true;
    }
    return false;
  }

  defineRelation(id, description) {
    super.defineRelation(id, description);
    const { handler } = this.setupRecords.relations.get(id);
    if (handler) {
      Object.entries(handler).forEach(([eventname, handle]) => {
        if (isFunction(handle)) {
          this.relationLifetimeHandlers = this.relationLifetimeHandlers =
            new Map();
          let handleMap = this.relationLifetimeHandlers.get(id);
          if (!handleMap) {
            handleMap = {};
            this.relationLifetimeHandlers.set(id, handleMap);
          }
          handleMap[eventname] = handle;
        }
      });
    }
  }
  setProvidedData(scope, key, data) {
    super.setProvidedData(scope, key, data);
    if (this.providedData && (isNonEmptyString(key) || isSymbol(key))) {
      if (isFunction(data)) {
        data = computed(data);
      }
      this.providedData.set(key, { data });
      return true;
    }
    return false;
  }

  getSetupProps() {
    const { defined, signal } = this.setupProps;
    if (defined && signal) return interpretSignal(signal);
    return Object.freeze({});
  }

  defineProperties(definations) {
    const values = super.defineProperties(definations);
    const [signal, assign] = signalized(values, SetupProps);
    this.setupProps.signal = signal;
    this.setupProps.assign = assign;
    this.setupProps.defined = true;
    return signal;
  }
  injectProvidedData(scope, key, defaultValue) {
    const signal = super.injectProvidedData(scope, key, defaultValue);
    const [_, set] = useSignal(signal);
    protectSignal(signal);
    if (isNonEmptyString(key) || isSymbol(key)) {
      scope.addLifetimeHandle("beforemount", () =>
        this.reactive().bindProvidedData(scope, key, set).inactive()
      );
    }
    return signal;
  }
  addMixedObserver(scope, src, callback) {
    super.addMixedObserver(scope, src, callback);
    if (isFunction(callback)) {
      const { key, signals, indexesMap } = formatObserveSource(src, scope);
      if (key) {
        if (signals.length) {
          // 组合字符串和signals的
          // 难点在于回调值的按序合并
          return createMixedObserver(src, callback, {
            instance: this,
            key,
            signals,
            indexesMap,
          });
        }
        return () => scope.on(`datachange/${key}`, callback);
      }
      if (signals.length) return watch(signals, (v) => callback(...v)).stop;
    }
    return () => false;
  }

  bindSignalsAndMethods() {
    this.assertIsActive("create bind signals and set methods");
    const { instance, setupReturns, methods } = this;
    const { setData, bind, unbinds } = createDataBinder(instance);
    Object.entries(setupReturns).forEach(([name, item]) => {
      if (isFunction(item)) {
        if (isSignal(item)) {
          if (isWatchable(item)) bind(name, item);
        } else methods?.set(name, item);
      } else if (isSignalizedObject(item)) bind(name, item);
    });
    if (unbinds.length) {
      instance.setData = setData;
    }
    return unbinds;
  }
  mountPageLifetimeHandles(scope) {
    this.assertIsActive("mount page lifetime handles");
    this.assertIsOfType("Page", "mount page lifetime handles");
    const { instance, setupLifetimes } = this;
    setupLifetimes.forEach((lifetime) => {
      const [handleName, replace] = pageLifetimeMap[lifetime];
      this.addLifetimeListener(scope, lifetime, instance[handleName]);
      if (replace) {
        instance[handleName] = scope.forwardInstanceLifetimeEvent.bind(
          scope,
          lifetime
        );
      }
    });
    return this;
  }
  mountPageEventHandle(scope) {
    this.assertIsActive("mount page event handles");
    this.assertIsOfType("Page", "mount page event handles");
    crossInstancePageEvents.get(scope.pageId)?.forEach((eventname) => {
      const handleName = `on${eventname}`;
      this.addPageEventHandle(scope, eventname, this.instance[handleName]);
      this.instance[handleName] = this.forwardPageEvent.bind(
        this,
        scope,
        eventname
      );
    });
    return this;
  }
  registerComponentLifetimeListener(scope, options) {
    this.assertIsActive("register component lifetime listeners");
    this.assertIsOfType("Component", "register component lifetime listeners");
    this.setupLifetimes.forEach((lifetime) => {
      let optHandler;
      if (componentLifetimeNames.includes(lifetime)) {
        optHandler = options.lifetimes?.[lifetime] || options[lifetime];
      } else if (componentPageLifetimeNames.includes(lifetime)) {
        optHandler = options.pageLifetimes?.[lifetime];
      } else return;
      this.addLifetimeListener(scope, lifetime, optHandler);
    });
    return this;
  }

  bindProvidedData(scope, key, onData) {
    this.assertIsActive("bind provided data");
    this.assertIsOfType("Component", "bind provided data");
    const data = scope.getAncestorProvidedData(
      key,
      this.runtime.getPageScope.bind(this.runtime)
    );
    // console.log("bindProvidedData", key, data);
    if (data) {
      this.injectedKeys.set(key, true);
      if (isWatchable(data.data)) {
        scope.addLifetimeHandle(
          "dispose",
          trackSignal(data.data, ({ value }) => onData(value))
        );
        onData(interpretSignal(data.data, true));
      } else onData(data.data);
    }
    return this;
  }
  getProvidedData(key) {
    this.assertIsActive("get provided data");
    // console.log("getProvidedData", key, providedData);
    return this.providedData.get(key) || null;
  }

  forwardPageEvent(scope, eventname, ...payload) {
    // console.log(`forwardPageEvent ${scope.pageId}/events/${eventname}`, payload);
    crossInstanceEventBus.emit(`${scope.pageId}/events/${eventname}`, payload);
    if (this.methods[eventname]) {
      this.methods[eventname].call(this.instance, ...payload);
    }
    return this;
  }
  forwardRelationEvent(relationid, eventname, ...args) {
    return this.relationLifetimeHandlers
      ?.get(relationid)
      ?.[eventname]?.call(this.instance, ...args);
  }
  forwardDataChangeEvent(src, ...values) {
    scope.emit(`datachange/${src}`, values);
    return this;
  }
  syncSetupPropValues(values) {
    const { defined, assign } = this.setupProps;
    if (defined && assign) assign(values);
  }
  invokeSetupMethod(methodName, ...args) {
    return this.methods?.get(methodName)?.call(this.instance, ...args);
  }
  onExpose() {
    console.log("onExport", this.setupRecords.exports);
    if (isFunction(this.setupRecords.exports)) {
      return this.setupRecords.exports.call(this);
    } else if (isPlainObject(this.setupRecords.exports)) {
      return this.setupRecords.exports;
    }
  }

  reset(configs = {}) {
    const pageId = this.instance.getPageId();
    if (pageId) {
      crossInstanceEventBus.offNamespace(pageId);
      crossInstancePageEvents.delete(pageId);
    }
    this.eventBus.clear();
    this.providedData.clear();
    this.methods.clear();
    this.relationLifetimeHandlers.clear();
    this.setupProps = {
      defined: false,
      signal: null,
      assign: null,
    };
    this.eventBus = null;
    this.providedData = null;
    this.methods = null;
    this.relationLifetimeHandlers = null;
    super.reset(configs);
  }
}
