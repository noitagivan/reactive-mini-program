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
  componentFullLifetimeNames,
  componentPageLifetimeNames,
  createDataBinder,
  createMixObserver,
  formatObserveSource,
  pageEventNames,
  pageLifetimeMap,
} from "../common";

const crossInstanceEventBus = new EventBus();
const crossInstancePageEvents = new Map();

export default class extends SetupContext {
  static invokeDefinedPageMethod(runtime, page, methodName, args) {
    return runtime
      .getPageScope(page.getPageId())
      ?.context.invokeSetupMethod(methodName, ...args);
  }
  static invokeDefinedComponentMethod(runtime, component, methodName, args) {
    return runtime
      .getComponentScope(component)
      ?.context.invokeSetupMethod(methodName, ...args);
  }
  static invokeDefinedPageDataObserver(runtime, page, src, values) {
    runtime
      .getPageScope(page.getPageId())
      ?.context.distributeDataChangeEvent(src, ...values);
  }
  static invokeDefinedComponentDataObserver(runtime, component, src, values) {
    runtime
      .getComponentScope(component)
      ?.context.distributeDataChangeEvent(src, ...values);
  }
  static syncSetupProps(runtime, component, propNames, values) {
    runtime
      .getComponentScope(component)
      ?.context.syncSetupProps(
        Object.fromEntries(propNames.map((prop, i) => [prop, values[i]]))
      );
  }

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

  setExportObject(object) {
    super.setExportObject(attrs);
  }
  getPackagedProps(values) {
    const { setupProps } = this;
    const [signal, getter, setter] = protectedObjectSignal(values);
    setupProps.getter = getter;
    setupProps.setter = setter;
    setupProps.defined = true;
    return signal;
  }
  getSetupProps() {
    const { defined, getter } = this.setupProps;
    if (defined && getter) return getter();
    return Object.freeze({});
  }
  syncSetupProps(values) {
    const { defined, setter } = this.setupProps;
    if (defined && setter) {
      this.setupProps.values = values;
      setter(values);
    }
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
            this.invokeCustomPageEvent(
              scope,
              `providedchange:${key}`,
              payload.value
            )
          );
          this.invokeCustomPageEvent(
            scope,
            `providedchange:${key}`,
            captureSignal(data, true)
          );
        } else {
          this.invokeCustomPageEvent(scope, `providedchange:${key}`, data);
        }
        this.invokeCustomPageEvent(scope, `provide`, key);
      }
      return true;
    }
    return false;
  }
  getProvidedData(key) {
    this.checkIsNotIdle("get provided data");
    const { isPage, providedData } = this;
    // console.log("getProvidedData", key, providedData);
    return providedData.get(key) || (isPage ? false : null);
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
        instance[handleName] = this.distributeLifeTimeEvent.bind(
          this,
          lifetime
        );
      }
    });
    return this;
  }
  registerComponentInstanceLifeTimeHandles(options) {
    this.checkIsNotIdle("create lifetime handles");
    this.checkIsType("Component", "create page hook handles");
    const { setupLifeTimes } = this;
    setupLifeTimes.forEach((lifetime) => {
      let optHandler;
      if (componentFullLifetimeNames.includes(lifetime)) {
        optHandler = options.lifetimes?.[lifetime] || options[lifetime];
      } else if (componentPageLifetimeNames.includes(lifetime)) {
        optHandler = options.pageLifetimes?.[lifetime];
      } else return;
      this.addLifetimeListener(lifetime, optHandler);
    });
    return this;
  }
  createPageInstanceHookHandle(scope) {
    this.checkIsNotIdle("create page hook handles");
    this.checkIsType("Page", "create page hook handles");
    crossInstancePageEvents.get(scope.pageId)?.forEach((eventname) => {
      const handleName = `on${eventname}`;
      this.addPageEventListener(scope, eventname, this.instance[handleName]);
      this.instance[handleName] = this.invokeSetupPageEvent.bind(
        this,
        scope,
        eventname
      );
    });
    return this;
  }

  distributeLifeTimeEvent(lifetime, ...payload) {
    this.eventBus.emit(`lifetimes/${lifetime}`, payload);
    return this;
  }
  invokeSetupPageEvent(scope, eventname, ...payload) {
    // console.log(`invokeSetupPageEvent ${scope.pageId}/events/${eventname}`, payload);
    crossInstanceEventBus.emit(`${scope.pageId}/events/${eventname}`, payload);
    console.log(this.methods);
    if (this.methods[eventname]) {
      this.methods[eventname].call(this.instance, ...payload);
    }
    return this;
  }
  invokeCustomPageEvent(scope, eventname, ...payload) {
    this.checkIsType("Page", "invoke custom page event");
    crossInstanceEventBus.emit(
      `${scope.pageId}/custom-events/${eventname}`,
      payload
    );
    return this;
  }
  distributeDataChangeEvent(src, ...values) {
    this.eventBus.emit(`datachange/${src}`, values);
    return this;
  }
  invokeSetupMethod(methodName, ...args) {
    return this.methods?.get(methodName)?.call(this.instance, ...args);
  }
  reset(configs = {}) {
    const pageId = this.instance.getPageId();
    if (pageId) crossInstanceEventBus.offNamespace(pageId);
    this.setupProps = {
      defined: false,
      getter: null,
      setter: null,
      values: {},
    };
    crossInstancePageEvents.delete(pageId);
    this.eventBus.clear();
    this.providedData.clear();
    this.methods.clear();
    super.reset(configs);
  }
}
