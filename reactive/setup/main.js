import { runInEffectFreeScope } from "../state/SignalScope";
import createInstanceScope from "./InstanceScope";
import RuntimeContext from "./RuntimeContext";
import {
  componentFullLifetimeNames,
  componentPageLifetimeNames,
  formatOptions,
} from "./util";

const CONTEXT = new RuntimeContext();
export const useCurrentSettingUpInstanceScope = () =>
  CONTEXT.exposeInstanceScope();
export const useCurrentSetupContext = () => CONTEXT.exposeSetupContext();

function setupPage(options) {
  const { setup, data: _data, observers: _observers, ..._methods } = options;
  const ctx = runInEffectFreeScope(() =>
    CONTEXT.runSetup(setup, CONTEXT.optionsSetupContext.reset({ isPage: true }))
  );
  const { data, methods } = ctx.getDataAndMethodsOptions(_data, _methods);
  const observers = ctx.getObserversOption(_observers);
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
        scope.run(
          (ctx) => {
            CONTEXT.runSetup(setup, ctx);
            ctx.createPageInstanceLifeTimeHandles(scope, options);
          },
          {
            setScope: (scp) => CONTEXT.setPageScope(pageId, scp),
            resetScope: () => CONTEXT.resetInstanceScope(),
          }
        );
        scope.attachTo(null, opts);
      },
      onUnload() {
        const pageId = this.getPageId();
        // console.log("onUnload", pageId);
        CONTEXT.getPageScope(pageId)?.stop();
        CONTEXT.setPageScope(pageId, null);
      },
      onShareAppMessage() {
        CONTEXT.getPageScope(pageId)?.stop();
        console.log("page.onShareAppMessage");
        return {
          title: "转发标题A",
          imageUrl: "", // 图片 URL
        };
      },
    },
  });
}

function setupComponent(options) {
  console.log("setupComponent options observers", options);
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
  const { properties, values: defaultProps } = ctx.getPropertiesOption(options);
  const { data, methods } = ctx.getDataAndMethodsOptions(_data, _methods);
  const observers = ctx.getObserversOption(_observers);
  const { lifetimes, pageLifetimes } = ctx.getLifetimeOptions(options);
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
          .use({ props: defaultProps })
          .run(
            (ctx) => {
              CONTEXT.runSetup(setup, ctx);
              componentFullLifetimeNames.forEach((lifetime) =>
                ctx.addLifetimeListener(
                  lifetime,
                  options.lifetimes?.[lifetime] || options[lifetime]
                )
              );
              componentPageLifetimeNames.forEach((lifetime) =>
                ctx.addLifetimeListener(
                  lifetime,
                  options.pageLifetimes?.[lifetime]
                )
              );
            },
            {
              setScope: (scope) => CONTEXT.setComponentScope(this, scope),
              resetScope: () => CONTEXT.resetInstanceScope(),
            }
          )
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
