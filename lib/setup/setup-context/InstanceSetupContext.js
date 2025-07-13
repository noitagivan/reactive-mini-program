import { protectedObjectSignal } from "../../state/ObjectSignal";
import {
  isSignal,
  isWatchable,
  subscribeStateOfSignal,
  isObjectSignal,
  computed,
} from "../../state/index";
import { captureSignal, protectedSignal } from "../../state/signal";
import { EventBus, isFunction, isNonEmptyString } from "../../utils/index";
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
  exposedMethods = new Map();
  relationLifetimeHandlers = new Map();

  addLifetimeListener(lifetime, handler) {
    if (super.addLifetimeListener(lifetime, handler)) {
      this.eventBus.on(`lifetimes/${lifetime}`, ({ payload }) =>
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
          subscribeStateOfSignal(data, (payload) =>
            this.forwardCustomPageEvent(
              scope,
              `providedchange:${key}`,
              payload.value
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
  bindProvidedData(scope, key, onData) {
    this.checkIsNotIdle("bind provided data");
    this.checkIsType("Component", "bind provided data");
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
          subscribeStateOfSignal(data.data, ({ value }) => onData(value))
        );
        onData(captureSignal(data.data, true));
      } else onData(data.data);
    } else this.subscribePageProvidedDataWrite(scope, key, onData);
    return this;
  }
  getProvidedData(key) {
    this.checkIsNotIdle("get provided data");
    const { isPage, providedData } = this;
    // console.log("getProvidedData", key, providedData);
    return providedData.get(key) || (isPage ? false : null);
  }
  subscribePageProvidedDataWrite(scope, key, onData) {
    this.checkIsType("Component", "subscribe page provided data");
    this.addCustomPageEventListener(
      scope,
      `providedchange:${key}`,
      onData,
      false
    );
    this.injectedKeys.set(key, false);
    return this;
  }

  defineProperties(definations) {
    const values = super.defineProperties(definations);
    const [signal, getter, setter] = protectedObjectSignal(values);
    this.setupProps.getter = getter;
    this.setupProps.setter = setter;
    this.setupProps.defined = true;
    return signal;
  }
  injectProvidedData(scope, key, defaultValue) {
    const [signal, setter] = protectedSignal(
      super.injectProvidedData(scope, key, defaultValue)
    );
    if (isNonEmptyString(key) || isSymbol(key)) {
      scope.addLifeTimeListener("beforemount", () =>
        this.reactive().bindProvidedData(scope, key, setter).inactive()
      );
    }
    return signal;
  }
  defineExportObject(object) {
    super.defineExportObject(object);
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
        return () => this.eventBus.on(`datachange/${key}`, observer);
      }
      if (signals.length) return watch(signals, (v) => observer(...v)).stop;
    }
    return () => false;
  }
  subscribePageProvidedDataReady(scope, handle) {
    super.subscribePageProvidedDataReady(scope, handle);
    this.addCustomPageEventListener(
      scope,
      "provide",
      (key) => {
        // console.log("subscribePageProvidedDataReady", key, this.injectedKeys);
        if (this.injectedKeys.get(key) === false) {
          this.injectedKeys.set(key, true);
          handle({ key });
        }
      },
      true
    );
  }

  bindSignalsAndSetMethods() {
    this.checkIsNotIdle("create bind signals and set methods");
    const { instance, setupReturns, methods } = this;
    const { setData, bind, unbinds } = createDataBinder(instance);
    Object.entries(setupReturns).forEach(([name, property]) => {
      if (isFunction(property)) {
        if (isSignal(property)) {
          if (isWatchable(property)) bind(name, property);
        } else methods?.set(name, property);
      } else if (isObjectSignal(property)) bind(name, property);
    });
    if (unbinds.length) {
      instance.setData = setData;
    }
    return unbinds;
  }
  registerPageInstanceLifeTimeHandles() {
    this.checkIsNotIdle("create lifetime handles");
    this.checkIsType("Page", "create page hook handles");
    const { instance, setupLifeTimes } = this;
    setupLifeTimes.forEach((lifetime) => {
      const [handleName, replace] = pageLifetimeMap[lifetime];
      this.addLifetimeListener(lifetime, instance[handleName]);
      if (replace) {
        instance[handleName] = this.forwardLifeTimeEvent.bind(this, lifetime);
      }
    });
    return this;
  }
  createPageInstanceHookHandle(scope) {
    this.checkIsNotIdle("create page hook handles");
    this.checkIsType("Page", "create page hook handles");
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
  registerComponentInstanceLifeTimeHandles(options) {
    this.checkIsNotIdle("create lifetime handles");
    this.checkIsType("Component", "create page hook handles");
    const { setupLifeTimes } = this;
    setupLifeTimes.forEach((lifetime) => {
      let optHandler;
      if (componentLifetimeNames.includes(lifetime)) {
        optHandler = options.lifetimes?.[lifetime] || options[lifetime];
      } else if (componentPageLifetimeNames.includes(lifetime)) {
        optHandler = options.pageLifetimes?.[lifetime];
      } else return;
      this.addLifetimeListener(lifetime, optHandler);
    });
    return this;
  }

  forwardLifeTimeEvent(lifetime, ...payload) {
    this.eventBus.emit(`lifetimes/${lifetime}`, payload);
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
    this.checkIsType("Page", "invoke custom page event");
    crossInstanceEventBus.emit(
      `${scope.pageId}/custom-events/${eventname}`,
      payload
    );
    return this;
  }
  forwardRelationEvent(relationName, eventName, ...args) {
    return this.relationLifetimeHandlers
      ?.get(relationName)
      ?.get(eventName)
      ?.call(this.instance, ...args);
  }
  forwardDataChangeEvent(src, ...values) {
    this.eventBus.emit(`datachange/${src}`, values);
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
  invokeExposedMethod(methodName, ...args) {
    return this.exposedMethods?.get(methodName)?.call(this.instance, ...args);
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
    this.exposedMethods.clear();
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
    this.exposedMethods = null;
    this.relationLifetimeHandlers = null;
    super.reset(configs);
  }
}
