import {
  createEffectScope,
  isWatchable,
  subscribeSignal,
} from "../state/index";
import { EventBus, isFunction, mergeCallbacks } from "../utils/index";
import InstanceSetupContext from "./InstanceSetupContext";

const eventBus = new EventBus();
class InstanceScope {
  isRunning = false;
  isPage = false;
  isComponent = false;
  instance = null;
  context = null;
  parentScope = null;
  effectScope = null;
  pageId = `pageId:-1`;

  callbacks = {
    beforemount: [],
    mounted: [],
    dispose: [],
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
        this.callbacks.dispose.push(...this.context.bindSignalsAndMethods());
      });
      ctx.resetScope(this);
      return this.context;
    } catch (error) {
      ctx.resetScope(this);
      throw error;
    }
  }
  attachTo(parentScope, options) {
    const { beforemount, mounted } = this.callbacks;
    if (parentScope) {
      this.parentScope = parentScope;
    }
    if (this.isPage) {
      this.context.invokeLifeTimeCallback("load", options);
    } else if (this.isComponent) {
      this.context.invokeLifeTimeCallback("attached");
    }
    mergeCallbacks(beforemount)();
    mergeCallbacks(mounted)();
    delete this.callbacks.beforemount;
    delete this.callbacks.mounted;
    return this;
  }
  bindParentProvidedData(key, setter) {
    let data;
    if (this.parentScope) {
      data = this.parentScope.context.getProvidedData(key);
    } else {
      data = this.context.getPageProvidedData(this, key);
    }

    console.log("bindParentProvidedData", key, data);
    if (data === false) return;
    if (data) {
      if (isWatchable(data.value)) {
        this.callbacks.dispose.push(
          subscribeSignal(data.value, ({ value }) => setter(value))
        );
      } else setter(data.value);
    } else {
      this.listenPageProvidedData(key, setter);
    }
  }

  listenPageProvidedData(key, setter) {
    this.callbacks.dispose.push(
      eventBus.on(`${this.pageId}/${key}`, ({ payload }) => setter(payload))
    );
  }
  broadcastPageProvidedData(key, value) {
    eventBus.emit(`${this.pageId}/${key}`, value);
  }
  onBeforeMount(cb) {
    const { beforemount } = this.callbacks;
    if (isFunction(cb)) beforemount.push(cb);
  }
  offBeforeMount(cb) {
    const { beforemount } = this.callbacks;
    this.callbacks.beforemount = beforemount.filter((fn) => fn !== cb);
  }
  onMounted(cb) {
    const { mounted } = this.callbacks;
    if (isFunction(cb)) mounted.push(cb);
  }
  offMounted(cb) {
    const { mounted } = this.callbacks;
    this.callbacks.mounted = mounted.filter((fn) => fn !== cb);
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
  console.log("instance.getPageId()", instance.getPageId());
  scope.context = new InstanceSetupContext({
    ...configs,
    instance,
  });
  scope.effectScope = createEffectScope();
  return scope;
}
