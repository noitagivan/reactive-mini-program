import { createEffectScope } from "../state/index";
import { EventBus } from "../utils/index";
import InstanceSetupContext from "./setup-context/InstanceSetupContext";

class InstanceLifetimeScope extends EventBus {
  #effectScope = null;
  #parentScope = null;
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
  get id() {
    return this.isPage
      ? this.#pageId
      : this.context.instance?.__wxExparserNodeId__;
  }
  get pageId() {
    return this.#pageId;
  }

  constructor(pageId) {
    super();
    this.#pageId = pageId;
    this.#effectScope = createEffectScope();
  }

  run(fn, runCtx) {
    try {
      runCtx?.setScope?.(this);
      this.#effectScope.run(() => {
        this.#isRunning = true;
        fn(this.context);
        this.#isRunning = false;
        this.context
          .bindSignalsAndMethods()
          .forEach((unbind) => this.addLifetimeHandle("dispose", unbind));
      });
      runCtx?.resetScope?.(this);
      return this.context;
    } catch (error) {
      runCtx?.resetScope?.(this);
      throw error;
    }
  }
  attachTo(parentScope) {
    if (parentScope) {
      this.#parentScope = parentScope;
    }
    this.emit(`scopelifetimes/beforemount`);
    // if (this.isPage) console.log(`[[ PAGE ] Mounted ]`);
    // else console.log(`[[ COMPONENT ] Mounted ]`, parentScope);
    return this;
  }
  getAncestorProvidedData(key, getPageScope) {
    if (this.#parentScope) {
      const data = this.#parentScope.context.getProvidedData(key);
      // console.log("getAncestorProvidedData", key, data);
      return (
        data || this.#parentScope.getAncestorProvidedData(key, getPageScope)
      );
    }
    return null;
  }
  addLifetimeHandle(lifetime, handle) {
    this.context.assertIsActive("add instance-scope lifetime handles");
    this.once(`scopelifetimes/${lifetime}`, handle);
    return true;
  }
  forwardInstanceLifetimeEvent(lifetime, ...payload) {
    this.emit(`lifetimes/${lifetime}`, payload);
    return this;
  }

  stop() {
    if (this.isPage) {
      this.forwardInstanceLifetimeEvent(`unload`);
    } else if (this.isComponent) {
      this.forwardInstanceLifetimeEvent(`detached`);
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
  const scope = new InstanceLifetimeScope(instance.getPageId());
  scope.context = new InstanceSetupContext({ ...configs }, instance);
  scope.isPage = !!configs.isPage;
  scope.isComponent = !!configs.isComponent;
  return scope;
}
