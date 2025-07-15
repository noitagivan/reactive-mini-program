import { objective } from "../../state/ObjectiveSignal";
import {
  isSignal,
  isWatchable,
  trackSignal,
  isObjectiveSignal,
  computed,
} from "../../state/index";
import { captureSignal, protectSignal, useSignal } from "../../state/signal";
import {
  EventBus,
  isFunction,
  isNonEmptyString,
  isPlainObject,
} from "../../utils/index";
import SetupContext from "./SetupContext";
import {
  componentLifetimeNames,
  componentPageLifetimeNames,
  createDataBinder,
  createMixObserver,
  formatObserveSource,
  pageEventNames,
  pageLifetimeMap,
} from "../common/index";

const crossInstanceEventBus = new EventBus();
const crossInstancePageEvents = new Map();

export default class extends SetupContext {
  eventBus = new EventBus();
  setupProps = {
    defined: false,
    getter: null,
    setter: null,
    values: {},
  };
  providedData = new Map();
  injectedKeys = new Map();
  methods = new Map();
  relationLifetimeHandlers = new Map();

  addLifetimeListener(scope, lifetime, handler) {
    if (super.addLifetimeListener(scope, lifetime, handler)) {
      scope.on(`lifetimes/${lifetime}`, ({ payload }) =>
        handler.call(this.instance, ...payload)
      );
      return true;
    }
    return false;
  }
  addPageEventListener(scope, eventname, handler) {
    super.addPageEventListener(scope, eventname, handler);
    if (pageEventNames.includes(eventname) && isFunction(handler)) {
      const events = crossInstancePageEvents.get(scope.pageId) || [];
      if (!events?.includes(eventname)) events.push(eventname);
      crossInstancePageEvents.set(scope.pageId, events);
      scope.addLifeTimeListener(
        "dispose",
        crossInstanceEventBus.on(
          `${scope.pageId}/events/${eventname}`,
          ({ payload }) => handler.call(this.instance, ...payload)
        )
      );
      return true;
    }
    return false;
  }
  addCustomPageEventListener(scope, eventname, handler, once = false) {
    super.addCustomPageEventListener(scope, eventname, handler, once);
    scope.addLifeTimeListener(
      "dispose",
      crossInstanceEventBus[once ? "once" : "on"](
        `${scope.pageId}/custom-events/${eventname}`,
        ({ payload }) => handler(...payload)
      )
    );
    return true;
  }

  defineRelation(id, description) {
    super.defineRelation(id, description);
    const { handlers } = this.setupRecords.relations.get(id);
    if (handlers) {
      Object.entries(handlers).forEach(([eventname, handler]) => {
        if (isFunction(handler)) {
          this.relationLifetimeHandlers = this.relationLifetimeHandlers =
            new Map();
          let handleMap = this.relationLifetimeHandlers.get(id);
          if (!handleMap) {
            handleMap = {};
            this.relationLifetimeHandlers.set(id, handleMap);
          }
          handleMap[eventname] = handler;
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
      // console.log("setProvidedData", key, data);
      if (this.isPage) {
        if (isWatchable(data)) {
          scope.addLifeTimeListener(
            "dispose",
            trackSignal(data, (payload) =>
              this.forwardCustomPageEvent(
                scope,
                `providedchange:${key}`,
                payload.value
              )
            )
          );
          this.forwardCustomPageEvent(
            scope,
            `providedchange:${key}`,
            captureSignal(data, true)
          );
        } else {
          this.forwardCustomPageEvent(scope, `providedchange:${key}`, data);
        }
        this.forwardCustomPageEvent(scope, `provide`, key);
      }
      return true;
    }
    return false;
  }

  getSetupProps() {
    const { defined, getter } = this.setupProps;
    if (defined && getter) return getter();
    return Object.freeze({});
  }

  defineProperties(definations) {
    const values = super.defineProperties(definations);
    const [signal, getter, setter] = objective(values);
    this.setupProps.getter = getter;
    this.setupProps.setter = setter;
    this.setupProps.defined = true;
    return signal;
  }
  injectProvidedData(scope, key, defaultValue) {
    const signal = super.injectProvidedData(scope, key, defaultValue);
    const [_, setter] = useSignal(signal);
    protectSignal(signal);
    if (isNonEmptyString(key) || isSymbol(key)) {
      scope.addLifeTimeListener("beforemount", () =>
        this.reactive().bindProvidedData(scope, key, setter).inactive()
      );
    }
    return signal;
  }
  addDataAndSignalObserver(scope, src, observer) {
    super.addDataAndSignalObserver(scope, src, observer);
    if (isFunction(observer)) {
      const { key, signals, indexesMap } = formatObserveSource(src, scope);
      if (key) {
        if (signals.length) {
          // 组合字符串和signals的
          // 难点在于回调值的按序合并
          return createMixObserver(src, observer, {
            instance: this,
            key,
            signals,
            indexesMap,
          });
        }
        return () => scope.on(`datachange/${key}`, observer);
      }
      if (signals.length) return watch(signals, (v) => observer(...v)).stop;
    }
    return () => false;
  }
  subscribePageProvidedDataReady(scope, handler) {
    super.subscribePageProvidedDataReady(scope, handler);
    this.addCustomPageEventListener(
      scope,
      "provide",
      (key) => {
        // console.log("subscribePageProvidedDataReady", key, this.injectedKeys);
        if (this.injectedKeys.get(key) === false) {
          this.injectedKeys.set(key, true);
          handler({ key });
        }
      },
      true
    );
  }

  bindSignalsAndSetMethods() {
    this.assertIsActive("create bind signals and set methods");
    const { instance, setupReturns, methods } = this;
    const { setData, bind, unbinds } = createDataBinder(instance);
    Object.entries(setupReturns).forEach(([name, item]) => {
      if (isFunction(item)) {
        if (isSignal(item)) {
          if (isWatchable(item)) bind(name, item);
        } else methods?.set(name, item);
      } else if (isObjectiveSignal(item)) bind(name, item);
    });
    if (unbinds.length) {
      instance.setData = setData;
    }
    return unbinds;
  }
  registerPageInstanceLifeTimeHandles(scope) {
    this.assertIsActive("create lifetime handlers");
    this.assertIsOfType("Page", "create page hook handlers");
    const { instance, setupLifeTimes } = this;
    setupLifeTimes.forEach((lifetime) => {
      const [handleName, replace] = pageLifetimeMap[lifetime];
      this.addLifetimeListener(scope, lifetime, instance[handleName]);
      if (replace) {
        instance[handleName] = scope.forwardInstanceLifeTimeEvent.bind(
          scope,
          lifetime
        );
      }
    });
    return this;
  }
  createPageInstanceHookHandle(scope) {
    this.assertIsActive("create page hook handlers");
    this.assertIsOfType("Page", "create page hook handlers");
    crossInstancePageEvents.get(scope.pageId)?.forEach((eventname) => {
      const handleName = `on${eventname}`;
      this.addPageEventListener(scope, eventname, this.instance[handleName]);
      this.instance[handleName] = this.forwardSetupPageEvent.bind(
        this,
        scope,
        eventname
      );
    });
    return this;
  }
  registerComponentInstanceLifeTimeHandlers(scope, options) {
    this.assertIsActive("create lifetime handlers");
    this.assertIsOfType("Component", "create page hook handlers");
    const { setupLifeTimes } = this;
    setupLifeTimes.forEach((lifetime) => {
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
    if (data === false) return this;
    if (data) {
      this.injectedKeys.set(key, true);
      if (isWatchable(data.data)) {
        scope.addLifeTimeListener(
          "dispose",
          trackSignal(data.data, ({ value }) => onData(value))
        );
        onData(captureSignal(data.data, true));
      } else onData(data.data);
    } else this.subscribePageProvidedDataWrite(scope, key, onData);
    return this;
  }
  getProvidedData(key) {
    this.assertIsActive("get provided data");
    const { isPage, providedData } = this;
    // console.log("getProvidedData", key, providedData);
    return providedData.get(key) || (isPage ? false : null);
  }
  subscribePageProvidedDataWrite(scope, key, onData) {
    this.assertIsOfType("Component", "subscribe page provided data");
    this.addCustomPageEventListener(
      scope,
      `providedchange:${key}`,
      onData,
      false
    );
    this.injectedKeys.set(key, false);
    return this;
  }

  forwardSetupPageEvent(scope, eventname, ...payload) {
    // console.log(`forwardSetupPageEvent ${scope.pageId}/events/${eventname}`, payload);
    crossInstanceEventBus.emit(`${scope.pageId}/events/${eventname}`, payload);
    if (this.methods[eventname]) {
      this.methods[eventname].call(this.instance, ...payload);
    }
    return this;
  }
  forwardCustomPageEvent(scope, eventname, ...payload) {
    this.assertIsOfType("Page", "invoke custom page event");
    crossInstanceEventBus.emit(
      `${scope.pageId}/custom-events/${eventname}`,
      payload
    );
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
    const { defined, setter } = this.setupProps;
    if (defined && setter) {
      this.setupProps.values = values;
      setter(values);
    }
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
      getter: null,
      setter: null,
      values: {},
    };
    this.eventBus = null;
    this.providedData = null;
    this.methods = null;
    this.relationLifetimeHandlers = null;
    super.reset(configs);
  }
}
