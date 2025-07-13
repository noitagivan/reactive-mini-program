import { createEffectScope } from "../state/index";
import { EventBus } from "../utils/index";
import InstanceSetupContext from "./setup-context/InstanceSetupContext";

class InstanceLifetimeScope extends EventBus {
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
      this.forwardInstanceLifeTimeEvent(`load`, options);
    } else if (this.isComponent) {
      this.forwardInstanceLifeTimeEvent(`attached`);
    }
    this.emit(`scopelifetimes/beforemount`).off(`scopelifetimes/beforemount`);
    this.emit(`scopelifetimes/mounted`).off(`scopelifetimes/mounted`);
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
    this.on(`scopelifetimes/${lifetime}`, handler);
    return true;
  }
  removeLifeTimeListener(lifetime, handler) {
    this.off(`scopelifetimes/${lifetime}`, handler);
    return true;
  }
  forwardInstanceLifeTimeEvent(lifetime, ...payload) {
    this.emit(`lifetimes/${lifetime}`, payload);
    return this;
  }

  stop() {
    if (this.isPage) {
      this.forwardInstanceLifeTimeEvent(`unload`);
    } else if (this.isComponent) {
      this.forwardInstanceLifeTimeEvent(`detached`);
    }
    this.emit(`scopelifetimes/dispose`).clear();
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

export default function createInstanceLifetimeScope(instance, configs) {
  const scope = new InstanceLifetimeScope(instance);
  scope.context = new InstanceSetupContext({
    ...configs,
    instance,
  });
  return scope;
}
