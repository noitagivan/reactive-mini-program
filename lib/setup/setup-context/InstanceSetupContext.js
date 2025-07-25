import {
  computed,
  isSignal,
  isWatchable,
  trackSignal,
  signalized,
  useSignal,
  interpretSignal,
  watch,
} from "../../state/index";
import { SignalCarrier } from "../../state/signal-carriers/carriers";
import { protectSignal } from "../../state/signal";
import {
  EventBus,
  isFunction,
  isNonEmptyString,
  isPlainObject,
} from "../../utils/index";
import {
  componentLifetimeNames,
  componentPageLifetimeNames,
  onceLifetimeNames,
  pageEventNames,
  pageLifetimeMap,
} from "../etc/constants";
import { createDataBinder, createMixedObserver } from "../etc/creators";
import { formatObserveSource } from "../etc/formatters";
import SetupContext from "./SetupContext";

class SetupProps extends SignalCarrier {}
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
  setupMethods = new Map();
  relationHandlers = new Map();

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
          this.relationHandlers = this.relationHandlers = new Map();
          let handleMap = this.relationHandlers.get(id);
          if (!handleMap) {
            handleMap = {};
            this.relationHandlers.set(id, handleMap);
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
      const { source, key, signals, indexesMap } = formatObserveSource(
        src,
        scope
      );
      if (key) {
        if (signals.length) {
          // 组合字符串和signals的
          // 难点在于回调值的按序合并
          return createMixedObserver(source, callback, {
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
    this.assertIsActive("bind signals and methods");
    const { instance, setupReturns, setupMethods } = this;
    const { setData, bind, unbinds } = createDataBinder(instance);
    Object.entries(setupReturns).forEach(([name, item]) => {
      if (isFunction(item)) {
        if (isSignal(item, true)) {
          if (isWatchable(item)) bind(name, item);
        } else setupMethods?.set(name, item);
      } else if (isWatchable(item)) bind(name, item);
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
      this.runtimeContext.getPageScope.bind(this.runtimeContext)
    );
    // console.log("bindProvidedData", key, data);
    if (data) {
      if (isSignal(data.data)) {
        if (isWatchable(data.data)) {
          scope.addLifetimeHandle(
            "dispose",
            trackSignal(data.data, ({ value }) => onData(value))
          );
        }
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
    if (this.setupMethods[eventname]) {
      this.setupMethods[eventname].call(this.instance, ...payload);
    }
    return this;
  }
  forwardRelationEvent(relationid, eventname, ...args) {
    return this.relationHandlers
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
  invokeSetupMethod(methodname, ...args) {
    return this.setupMethods?.get(methodname)?.call(this.instance, ...args);
  }
  onExpose() {
    console.log("onExpose", this.setupRecords.exports);
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
    this.setupMethods.clear();
    this.relationHandlers.clear();
    this.setupProps = {
      defined: false,
      signal: null,
      assign: null,
    };
    this.eventBus = null;
    this.providedData = null;
    this.setupMethods = null;
    this.relationHandlers = null;
    super.reset(configs);
  }
}
