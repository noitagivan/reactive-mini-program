import { runInEffectFreeScope } from "../state/SignalScope";
import createInstanceScope from "./InstanceScope";
import RuntimeContext from "./RuntimeContext";
import { formatOptions } from "./util";

const CONTEXT = new RuntimeContext();
export const useCurrentSettingUpInstanceScope = () =>
  CONTEXT.exposeInstanceScope();
export const useCurrentSetupContext = () => CONTEXT.exposeSetupContext();

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
  const { data, methods } = ctx.createDataAndMethodsOptions(_data, {
    ...__methods,
    ..._methods,
  });
  const observers = ctx.createObserversOption(_observers);
  ctx.reset();

  // 用 Component 来创建 Page，
  // 以获得更大的灵活性
  Component({
    data,
    observers,
    methods: {
      ...methods,
      onLoad(opts) {
        const pageId = this.getPageId();
        console.log("lifetimes/onLoad", pageId, this, opts);
        const scope = createInstanceScope(this, { isPage: true });
        scope
          .run((ctx) => CONTEXT.runSetup(setup, ctx), {
            setScope: (scp) => CONTEXT.setPageScope(pageId, scp),
            resetScope: () => CONTEXT.resetInstanceScope(),
          })
          .registerPageInstanceLifeTimeHandles()
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
  const properties = ctx.createPropertiesOption(options);
  const { data, methods } = ctx.createDataAndMethodsOptions(_data, _methods);
  const observers = ctx.createObserversOption(_observers);
  const { lifetimes, pageLifetimes } = ctx.createLifetimeOptions(options);
  ctx.reset();

  Component({
    // ...options,
    properties,
    data,
    methods,
    observers,
    lifetimes: {
      ...lifetimes,
      created() {
        createInstanceScope(this, {
          isComponent: true,
        })
          .run((ctx) => CONTEXT.runSetup(setup, ctx), {
            setScope: (scope) => CONTEXT.setComponentScope(this, scope),
            resetScope: () => CONTEXT.resetInstanceScope(),
          })
          .registerComponentInstanceLifeTimeHandles(options)
          .inactive()
          .distributeLifeTimeEvent("created");
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
