import { useSignal } from "../../state/signal";
import {
  isConstructor,
  isFunction,
  isNonNullObject,
  onceInvokable,
} from "../../utils/index";
import {
  componentFullLifetimeNames,
  componentPageLifetimeNames,
  pageLifetimeMap,
} from "../util";

export default class {
  runtime = null;
  instance = null;
  isSetupIdle = true;
  isPage = false;
  isComponent = false;
  setupRecords = {
    componentProps: {},
    observers: {},
  };
  setupLifeTimes = [];
  setupReturns = {};

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
  exposeDefiners(scope) {
    const definers = {
      provide: this.setProvidedData.bind(this, scope),
    };
    if (this.isPage) {
      // definers.onShareAppMessage = this.setSharingMessage.bind(this);
    } else if (this.isComponent) {
      definers.defineProps = onceInvokable(
        this.defineProps.bind(this, scope),
        "cannot define properties more than once for a component"
      );
      definers.observe = this.addDataAndSignalObserver.bind(this, scope);
      definers.inject = this.injectProvidedData.bind(this, scope);
    }
    return Object.freeze(definers);
  }
  exposeContext(scope) {
    const ctx = {
      $this: this.instance || null,
      isSettingUpOptions: !this.instance,
      isSettingUpInstance: !!this.instance,
      isPage: this.isPage,
      isComponent: this.isComponent,
    };
    if (this.isComponent) {
      ctx.emit =
        scope?.instance.triggerEvent.bind(scope.instance) || (() => {});
      ctx.$props = scope
        ? () => ({ ...(scope.context.getSetupProps() || {}) })
        : () => ({});
    }
    this.isSetupIdle = false;
    return Object.freeze(ctx);
  }

  /**
   *
   * @param {*} scope
   * @param {*} definations
   * @returns
   */
  defineProps(scope, definations) {
    this.checkIsNotIdle("define properties");
    this.checkIsType("Component", "define properties");
    if (isNonNullObject(definations) === false)
      throw new Error("properties must be a non-null object");
    if (scope) return scope.context.getPackagedProps();

    const names = [];
    const option = {};
    const values = {};
    Object.entries(definations).forEach(([name, property]) => {
      if (isNonNullObject(property)) {
        values[name] = property.value;
      } else if (isConstructor(property)) {
        try {
          values[name] = property();
        } catch (error) {
          values[name] = undefined;
        }
      } else return;
      option[name] = property;
      names.push(name);
    });
    this.setupRecords.componentProps = { names, option, values };
    return Object.freeze({ ...values });
  }
  setProvidedData(scope, key, value) {
    this.checkIsNotIdle("provide data");
  }
  injectProvidedData(scope, key, defaultValue) {
    this.checkIsNotIdle("inject provided data");
    this.checkIsType("Component", "define properties");
    const [signal] = useSignal(defaultValue);
    return signal;
  }
  /**
   * @param { string } lifetime 生命周期名称
   * @param { () => void } listener 生命周期回调函数
   */
  addLifetimeListener(lifetime, listener) {
    this.checkIsNotIdle("add lifetime listeners");
    if (isFunction(listener)) {
      if (this.isPage && pageLifetimeMap[lifetime]) {
        this.setupLifeTimes.push(lifetime);
        return true;
      }
      if (
        this.isComponent &&
        (componentFullLifetimeNames.includes(lifetime) ||
          componentPageLifetimeNames.includes(lifetime))
      ) {
        this.setupLifeTimes.push(lifetime);
        return true;
      }
    }
    return false;
  }
  addPageEventListener(scope, eventname, listener) {
    this.checkIsNotIdle("add page event listeners");
  }
  setPageHook(scope, name, hook) {
    this.checkIsNotIdle("add page hook");
    this.checkIsType("Page", "add page hook");
  }

  /**
   *
   * @param {*} scope dddd
   * @param {*} src
   * @param {*} observer
   * @returns
   */
  addDataAndSignalObserver(scope, src, observer) {
    this.checkIsNotIdle("observe data or signals");
    return () => false;
  }

  reset(configs = {}) {
    this.isSetupIdle = true;
    this.isPage = false;
    this.isComponent = false;
    this.setupRecords = {
      componentProps: {},
      observers: {},
    };
    this.setupLifeTimes = [];
    this.setupReturns = {};
    this.instance = null;
    return Object.assign(this, configs);
  }
}
