import { runInEffectFreeScope } from "../state/EffectScope";
import createInstanceLifetimeScope from "./InstanceLifetimeScope";
import RuntimeContext from "./RuntimeContext";
import { formatOptions } from "./common/index";

const CONTEXT = new RuntimeContext();
export const useActiveSetupContext = () => CONTEXT.exposeActiveSetupContext();

function setupPage(options) {
  const {
    setup,
    data: _data,
    observers: _observers,
    methods: _methods,
    ...__methods
  } = options;
  const ctx = runInEffectFreeScope(() =>
    CONTEXT.runSetup(setup, CONTEXT.optionsSetupContext.reset({ isPage: true }))
  );
  const formattedOptions = ctx.formatOptions(options);
  const { data, methods } = ctx.createDataAndMethodsOptions(_data, {
    ...__methods,
    ..._methods,
  });
  const observers = ctx.createObserversOption(_observers);
  ctx.reset();

  // 用 Component 来创建 Page，
  // 以获得更大的灵活性
  Component({
    ...formattedOptions,
    data,
    observers,
    methods: {
      ...methods,
      onLoad(opts) {
        const pageId = this.getPageId();
        console.log("lifetimes/onLoad", pageId, this, opts);
        const scope = createInstanceLifetimeScope(this, { isPage: true });
        scope
          .run((ctx) => CONTEXT.runSetup(setup, ctx), {
            setScope: (scp) => CONTEXT.setPageScope(pageId, scp),
            resetScope: () => CONTEXT.resetInstanceLifetimeScope(),
          })
          .registerPageInstanceLifeTimeHandles(scope)
          .createPageInstanceHookHandle(scope)
          .inactive();
        scope.attachTo(null, opts);
      },
      onUnload() {
        const pageId = this.getPageId();
        // console.log("onUnload", pageId);
        CONTEXT.getPageScope(pageId)?.stop();
        CONTEXT.setPageScope(pageId, null);
      },
    },
  });
}

function setupComponent(options) {
  const {
    setup,
    data: _data,
    observers: _observers,
    methods: _methods,
  } = options;
  const ctx = runInEffectFreeScope(() =>
    CONTEXT.runSetup(
      setup,
      CONTEXT.optionsSetupContext.reset({ isComponent: true })
    )
  );
  const formattedOptions = ctx.formatOptions(options);
  const properties = ctx.createPropertiesOption(options);
  const { data, methods } = ctx.createDataAndMethodsOptions(_data, _methods);
  const observers = ctx.createObserversOption(_observers);
  const { lifetimes, pageLifetimes } = ctx.createLifetimeOptions(options);
  ctx.reset();
  console.log("formattedOptions", formattedOptions);

  Component({
    ...formattedOptions,
    properties,
    data,
    methods,
    observers,
    lifetimes: {
      ...lifetimes,
      created() {
        const scope = createInstanceLifetimeScope(this, {
          isComponent: true,
        });
        scope
          .run((ctx) => CONTEXT.runSetup(setup, ctx), {
            setScope: (scope) => CONTEXT.setComponentScope(this, scope),
            resetScope: () => CONTEXT.resetInstanceLifetimeScope(),
          })
          .registerComponentInstanceLifeTimeHandles(scope, options)
          .inactive();
        scope.forwardInstanceLifeTimeEvent(`created`);
      },
      attached() {
        console.log("lifetimes/attached", this.__wxExparserNodeId__, this);
        const scope = CONTEXT.getComponentScope(this);
        scope?.attachTo(CONTEXT.getParentComponentScopeOf(scope));
      },
      detached() {
        // console.log("lifetimes/detached", this.__wxExparserNodeId__);
        CONTEXT.getComponentScope(this)?.stop();
        CONTEXT.setComponentScope(this, null);
      },
    },
    pageLifetimes,
  });
}

export function definePage(setup, options) {
  setupPage(formatOptions(setup, options));
}
export function defineComponent(setup, options) {
  setupComponent(formatOptions(setup, options));
}
