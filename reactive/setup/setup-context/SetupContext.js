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
  pageEventNames,
  pageHookNames,
  pageLifetimeMap,
} from "../util";

export default class {
  runtime = null;
  instance = null;
  isPage = false;
  isComponent = false;
  setupRecords = {
    componentProps: {},
    observers: {},
  };
  setupLifeTimes = [];
  setupReturns = {};

  get isSetupIdle() {
    return !this.runtime?.getSetupContext();
  }

  constructor(configs = {}) {
    Object.assign(this, configs);
  }

  reactive() {
    this.runtime?.setSetupContext(this);
    return this;
  }
  checkIsNotIdle(action) {
    if (this.isSetupIdle)
      throw new Error(`cannot ${action} without setup context`);
  }
  checkIsType(type, action) {
    if (!this[`is${type}`])
      throw new Error(`cannot ${action} in Non-${type} setup context`);
  }
  exposeContext(scope) {
    const ctx = {
      isSettingUpOptions: !this.instance,
      isSettingUpInstance: !!this.instance,
      isPage: this.isPage,
      isComponent: this.isComponent,
      $this: this.instance || null,
      provide: this.setProvidedData.bind(this, scope),
    };
    if (this.isPage) {
      // ctx.onShareAppMessage = this.setSharingMessage.bind(this);
      pageEventNames.forEach((name) => {
        ctx[`on${name}`] = this.addPageEventListener.bind(this, scope, name);
      });
      pageHookNames.forEach((name) => {
        ctx[`on${name}`] = () => {};
      });
    } else if (this.isComponent) {
      ctx.$emit =
        scope?.instance.triggerEvent.bind(scope.instance) || (() => {});
      ctx.inject = this.injectProvidedData.bind(this, scope);
      ctx.defineProps = onceInvokable(
        this.defineProps.bind(this, scope),
        "cannot define properties more than once for a component"
      );
      ctx.$props = this.getSetupProps.bind(this);
      ctx.observe = this.addDataAndSignalObserver.bind(this, scope);
      ctx.onPageDataProvide = this.subscribePageProvidedDataReady.bind(
        this,
        scope
      );
    }
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

    if (scope) {
      return scope.context.getPackagedProps(values);
    }
    this.setupRecords.componentProps = { names, option, values };
    return Object.freeze({ ...values });
  }
  getSetupProps() {
    return Object.freeze({
      ...(this.setupRecords.componentProps.values || {}),
    });
  }
  setProvidedData(scope, key, data) {
    this.checkIsNotIdle("provide data");
    return false;
  }
  injectProvidedData(scope, key, defaultValue) {
    this.checkIsNotIdle("inject provided data");
    this.checkIsType("Component", "define properties");
    const [signal] = useSignal(defaultValue);
    return signal;
  }
  subscribePageProvidedDataReady(scope, handle) {
    this.checkIsNotIdle("add page data provide listen");
    this.checkIsType("Component", "add page data provide listen");
    return true;
  }
  /**
   * @param { string } lifetime 生命周期名称
   * @param { () => void } handle 生命周期回调函数
   */
  addLifetimeListener(lifetime, handle) {
    this.checkIsNotIdle("add lifetime listeners");
    if (isFunction(handle)) {
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
  addPageEventListener(scope, eventname, handle) {
    this.checkIsNotIdle("add page event listeners");
    return false;
  }
  setPageHook(scope, name, hook) {
    this.checkIsNotIdle("add page hook");
    this.checkIsType("Page", "add page hook");
    return false;
  }
  addCustomPageEventListener(scope, eventname, handle, once = false) {
    this.checkIsNotIdle("add custom page event listeners");
    return false;
  }
  /**
   *
   * @param {*} scope
   * @param {*} src
   * @param {*} observer
   * @returns
   */
  addDataAndSignalObserver(scope, src, observer) {
    this.checkIsNotIdle("observe data or signals");
    return () => false;
  }

  inactive() {
    if (this.runtime?.getSetupContext() === this) {
      this.runtime.setSetupContext(null);
    }
    return this;
  }
  reset(configs = {}) {
    this.inactive();
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
