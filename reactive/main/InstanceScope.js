import { createEffectScope } from "../state/index";
import { isFunction, mergeCallbacks } from "../utils/index";
import InstanceSetupContext from "./InstanceSetupContext";

class InstanceScope {
  isRunning = false;
  isPage = false;
  isComponent = false;
  instance = null;
  context = null;
  parentScope = null;
  effectScope = null;
  pageId = -1;

  callbacks = {
    attach: [],
    dispose: [],
    unbinds: [],
  };

  getId() {
    return this.isPage ? this.pageId : this.instance.__wxExparserNodeId__;
  }

  use({ props }) {
    if (props) {
      this.context.setupProps.values = props;
    }
    return this;
  }
  run(fn, ctx) {
    try {
      ctx.setScope(this);
      this.effectScope.run(() => {
        this.isRunning = true;
        fn(this.context);
        this.isRunning = false;
        this.callbacks.unbinds = this.context.bindSignalsAndMethods();
      });
      ctx.resetScope(this);
      return this.context;
    } catch (error) {
      ctx.resetScope(this);
      throw error;
    }
  }
  attachTo(parentScope, options) {
    const { attach } = this.callbacks;
    if (parentScope) {
      this.parentScope = parentScope;
    }
    if (this.isPage) {
      this.context.invokeLifeTimeCallback("load", options);
    } else if (this.isComponent) {
      this.context.invokeLifeTimeCallback("attached");
    }
    mergeCallbacks(attach)();
    delete this.callbacks.attach;
    return this;
  }
  onAttached(cb) {
    const { attach } = this.callbacks;
    if (isFunction(cb)) attach.push(cb);
  }
  offAttached(cb) {
    const { attach } = this.callbacks;
    this.callbacks.attach = attach.filter((fn) => fn !== cb);
  }
  onDispose(cb) {
    const { dispose } = this.callbacks;
    dispose.push(cb);
  }
  offDispose(cb) {
    const { dispose } = this.callbacks;
    this.callbacks.dispose = dispose.filter((fn) => fn !== cb);
  }
  stop() {
    // console.log("stop", this.effectScope, this.setupRecords.unbind);
    if (this.isPage) {
      this.context.invokeLifeTimeCallback("unload");
    } else if (this.isComponent) {
      this.context.invokeLifeTimeCallback("detached");
    }
    mergeCallbacks(this.callbacks.dispose)();
    mergeCallbacks(this.callbacks.unbinds)();
    this.context.reset();
    this.setupProps = {
      defined: false,
      getter: null,
      setter: null,
    };
    this.callbacks = {};

    this.effectScope.stop();
    this.effectScope = null;
  }
}

export default function createInstanceScope(instance, configs) {
  const scope = new InstanceScope();
  scope.instance = instance;
  scope.pageId = instance.getPageId();
  scope.context = new InstanceSetupContext({
    ...configs,
    instance,
  });
  scope.effectScope = createEffectScope();
  return scope;
}
