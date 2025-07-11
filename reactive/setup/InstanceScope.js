import {
  createEffectScope,
  isWatchable,
  subscribeStateOfSignal,
} from "../state/index";
import { EventBus } from "../utils/index";
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
        this.context
          .bindSignalsAndMethods()
          .forEach((unbind) => this.onDispose(unbind));
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
      this.parentScope = parentScope;
    }
    if (this.isPage) {
      this.context.invokeLifeTimeCallback("load", options);
    } else if (this.isComponent) {
      this.context.invokeLifeTimeCallback("attached");
    }
    eventBus
      .emit(`${this.pageId}/lifetime:beforemount`)
      .off(`${this.pageId}/lifetime:beforemount`);
    eventBus
      .emit(`${this.pageId}/lifetime:mounted`)
      .off(`${this.pageId}/lifetime:mounted`);
    return this;
  }
  bindParentProvidedData(key, setter) {
    let data;
    if (this.parentScope) {
      data = this.parentScope.context.getProvidedData(this.parentScope, key);
    } else {
      data = this.context.getPageProvidedData(this, key);
    }
    if (data === false) return;
    if (data) {
      if (isWatchable(data.value)) {
        this.onDispose(
          subscribeStateOfSignal(data.value, ({ value }) => setter(value))
        );
      } else setter(data.value);
    } else this.listenPageProvidedData(key, setter);
  }

  listenPageProvidedData(key, setter) {
    this.onDispose(
      eventBus.on(`${this.pageId}/provide:${key}`, ({ payload }) =>
        setter(payload)
      )
    );
  }
  broadcastPageProvidedData(key, value) {
    eventBus.emit(`${this.pageId}/provide:${key}`, value);
  }
  onBeforeMount(cb) {
    eventBus.on(`${this.pageId}/lifetime:beforemount`, cb);
  }
  offBeforeMount(cb) {
    eventBus.off(`${this.pageId}/lifetime:beforemount`);
  }
  onMounted(cb) {
    eventBus.on(`${this.pageId}/lifetime:mounted`, cb);
  }
  offMounted(cb) {
    eventBus.off(`${this.pageId}/lifetime:mounted`, cb);
  }
  onDispose(cb) {
    eventBus.on(`${this.pageId}/lifetime:dispose`, cb);
  }
  offDispose(cb) {
    eventBus.off(`${this.pageId}/lifetime:dispose`, cb);
  }
  stop() {
    if (this.isPage) {
      this.context.invokeLifeTimeCallback("unload");
    } else if (this.isComponent) {
      this.context.invokeLifeTimeCallback("detached");
    }
    eventBus.emit(`${this.pageId}/lifetime:dispose`).offNamespace(this.pageId);

    this.context.reset();
    this.setupProps = {
      defined: false,
      getter: null,
      setter: null,
    };

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
