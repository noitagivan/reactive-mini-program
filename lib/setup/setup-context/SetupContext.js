import { useSignal } from "../../state/signal";
import {
  isConstructor,
  isFunction,
  isNonNullObject,
  onceInvokable,
} from "../../utils/index";
import {
  componentLifetimeNames,
  componentPageLifetimeNames,
  pageEventNames,
  pageLifetimeMap,
} from "../common";

export default class {
  runtime = null;
  instance = null;
  isPage = false;
  isComponent = false;
  setupRecords = {
    options: undefined,
    exportObj: null,
    behaviors: [],
    classAttrs: [],
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
  checkIsNotIdle(action) {
    if (this.isSetupIdle)
      throw new Error(`cannot ${action} without setup context`);
  }
  checkIsType(type, action) {
    if (!this[`is${type}`])
      throw new Error(`cannot ${action} in Non-${type} setup context`);
  }

  expose(scope) {
    const ctx = {
      isSettingUpOptions: !this.instance,
      isSettingUpInstance: !!this.instance,
      isPage: this.isPage,
      isComponent: this.isComponent,
      $this: this.instance || null,
      provide: this.setProvidedData.bind(this, scope),
      config: this.setConfigOptions.bind(this),
      use: this.addBehaviors.bind(this),
    };
    if (this.isPage) {
      pageEventNames.forEach((name) => {
        ctx[`on${name}`] = this.addPageEventListener.bind(this, scope, name);
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
      ctx.externalClasses = this.addExternalClasses.bind(this);
      ctx.expose = this.setExportObject.bind(this);
    }
    return Object.freeze(ctx);
  }

  setConfigOptions(options) {
    this.checkIsNotIdle("set options");
  }
  addBehaviors(behaviors, ...more) {
    this.checkIsNotIdle("add behaviors");
  }
  addExternalClasses(attrNames, ...more) {
    this.checkIsNotIdle("add external classes");
    this.checkIsType("Component", "add external classes");
  }
  setExportObject(behaviors) {
    this.checkIsNotIdle("set export object");
    this.checkIsType("Component", "set export object");
    // 设置为不允许暴露 signal, 这样来解决 signal 的 scope 问题
    // 对于标量，直接赋值即可
    // 对于函数，做调用重定向
    // 对于对象（含Array），直接传递，但抛出 Warning
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
          console.error(`init property ${name} error`);
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
        (componentLifetimeNames.includes(lifetime) ||
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
  reactive() {
    this.runtime?.setSetupContext(this);
    return this;
  }
  reset(configs = {}) {
    this.inactive();
    this.isPage = false;
    this.isComponent = false;
    this.setupRecords = {
      options: undefined,
      behaviors: [],
      componentProps: {},
      observers: {},
    };
    this.setupLifeTimes = [];
    this.setupReturns = {};
    this.instance = null;
    return Object.assign(this, configs);
  }
}
