import { createEffectScope } from "../state/index";
import { EventBus } from "../utils/index";
import InstanceSetupContext from "./setup-context/InstanceSetupContext";

class InstanceScope extends EventBus {
  #effectScope = null;
  #parentScope = null;
  #instance = null;
  #isRunning = false;
  #pageId = `pageId:-1`;

  isPage = false;
  isComponent = false;

  context = null;

  get parentScope() {
    return this.#parentScope;
  }

  get isRunning() {
    return this.#isRunning;
  }
  get instance() {
    return this.#instance;
  }
  get id() {
    return this.isPage ? this.#pageId : this.#instance.__wxExparserNodeId__;
  }
  get pageId() {
    return this.#pageId;
  }

  constructor(instance) {
    super();
    this.#instance = instance;
    this.#pageId = instance.getPageId();
    this.#effectScope = createEffectScope();
  }

  run(fn, ctx) {
    try {
      ctx.setScope(this);
      this.#effectScope.run(() => {
        this.#isRunning = true;
        fn(this.context);
        this.#isRunning = false;
        this.context
          .bindSignalsAndSetMethods()
          .forEach((unbind) => this.addLifeTimeListener("dispose", unbind));
      });
      ctx.resetScope(this);
      return this.context;
    } catch (error) {
      ctx.resetScope(this);
      throw error;
    }
  }
  attachTo(parentScope, options) {
    if (parentScope) {
      this.#parentScope = parentScope;
    }
    if (this.isPage) {
      this.context.distributeLifeTimeEvent("load", options);
    } else if (this.isComponent) {
      this.context.distributeLifeTimeEvent("attached");
    }
    this.emit(`lifetimes/beforemount`).off(`lifetimes/beforemount`);
    this.emit(`lifetimes/mounted`).off(`lifetimes/mounted`);
    return this;
  }
  getAncestorProvidedData(key, getPageScope) {
    if (this.#parentScope) {
      const data = this.#parentScope.context.getProvidedData(key);
      // console.log("getAncestorProvidedData", key, data);
      if (data) return data;
      return this.#parentScope.getAncestorProvidedData(key, getPageScope);
    }
    const pageIntanceScope = getPageScope(this.#pageId);
    if (pageIntanceScope) {
      this.#parentScope = pageIntanceScope;
      return pageIntanceScope.context.getProvidedData(key);
    }
    return null;
  }

  addLifeTimeListener(lifetime, handler) {
    this.context.checkIsNotIdle("add instance-scope lifetime listeners");
    this.on(`lifetimes/${lifetime}`, handler);
  }
  removeLifeTimeListener(lifetime, handler) {
    this.off(`lifetimes/${lifetime}`, handler);
  }

  stop() {
    if (this.isPage) {
      this.context.distributeLifeTimeEvent("unload");
    } else if (this.isComponent) {
      this.context.distributeLifeTimeEvent("detached");
    }
    this.emit(`lifetimes/dispose`).clear();
    this.context.reset();
    this.setupProps = {
      defined: false,
      getter: null,
      setter: null,
    };

    this.#effectScope.stop();
    this.#effectScope = null;
  }
}

export default function createInstanceScope(instance, configs) {
  const scope = new InstanceScope(instance);
  scope.context = new InstanceSetupContext({
    ...configs,
    instance,
  });
  return scope;
}
