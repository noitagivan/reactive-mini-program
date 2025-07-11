import { runInSilentScope } from "../state/SignalScope";
import createInstanceScope from "./InstanceScope";
import RuntimeContext from "./RuntimeContext";
import {
  cLifetimes,
  formatOptions,
  partialCLifetimes,
  pLifetimes,
} from "./util";

const CONTEXT = new RuntimeContext();
export const useCurrentSettingUpInstanceScope = () =>
  CONTEXT.exposeInstanceScope();
export const useCurrentSetupContext = () => CONTEXT.exposeSetupContext();

function setupPage(options) {
  const { setup, onLoad, onReady, onUnload } = options;
  const { onShow, onHide, onResize, onrouteDone } = options;

  const ctx = runInSilentScope(() =>
    CONTEXT.runSetup(setup, CONTEXT.optionsSetupContext.reset({ isPage: true }))
  );
  const { data, methods } = ctx.initDataAndMethods(options);
  ctx.reset();

  Page({
    ...methods,
    data,
    onLoad(opts) {
      const pageId = this.getPageId();
      // console.log("lifetimes/onLoad", pageId, this);
      const scope = createInstanceScope(this, { isPage: true });
      const ctx = scope.run((ctx) => CONTEXT.runSetup(setup, ctx), {
        setScope: (scp) => CONTEXT.setPageScope(pageId, scp),
        resetScope: () => CONTEXT.resetInstanceScope(),
      });
      this.onReady = ctx.setLifeTimeCallback("ready", onReady);
      this.onShow = ctx.setLifeTimeCallback("show", onShow);
      this.onHide = ctx.setLifeTimeCallback("hide", onHide);
      this.onResize = ctx.setLifeTimeCallback("pageresize", onResize);
      this.onrouteDone = ctx.setLifeTimeCallback("routeDone", onrouteDone);
      ctx.setLifeTimeCallback("load", onLoad);
      ctx.setLifeTimeCallback("unload", onUnload);
      scope.attachTo(null, opts);
    },
    onUnload() {
      const pageId = this.getPageId();
      // console.log("onUnload", pageId);
      CONTEXT.getPageScope(pageId)?.stop();
      CONTEXT.setPageScope(pageId, null);
    },
  });
}
function setupComponent(options) {
  console.log("setupComponent options observers", options);
  const { setup, lifetimes, pageLifetimes } = options;
  const ctx = runInSilentScope(() =>
    CONTEXT.runSetup(
      setup,
      CONTEXT.optionsSetupContext.reset({ isComponent: true })
    )
  );
  const { data, methods } = ctx.initDataAndMethods(options);
  const { componentProps, componentObservers } = ctx.setupRecords;
  const {
    names: propNames,
    option: propsOption,
    values: defaultProps,
  } = componentProps;
  const properties = propsOption || options.properties || {};
  const observers = CONTEXT.settleObserversOption(
    propNames,
    componentObservers,
    options.observers
  );
  ctx.reset();

  Component({
    // ...options,
    properties,
    data,
    methods,
    observers,
    lifetimes: {
      ...CONTEXT.createLifetimeHooks(partialCLifetimes),
      created() {
        const scope = createInstanceScope(this, {
          isComponent: true,
        }).use({ props: defaultProps });
        // console.log("lifetimes/created", scope.pageId, scope.getId());
        const ctx = scope.run((ctx) => CONTEXT.runSetup(setup, ctx), {
          setScope: (scp) => CONTEXT.setComponentScope(this, scp),
          resetScope: () => CONTEXT.resetInstanceScope(),
        });
        cLifetimes.forEach((lifetime) => {
          const optCbs = lifetimes?.[lifetime] || options[lifetime];
          ctx.setLifeTimeCallback(lifetime, optCbs);
        });
        pLifetimes.forEach((lifetime) =>
          ctx.setLifeTimeCallback(lifetime, pageLifetimes?.[lifetime])
        );
        ctx.invokeLifeTimeCallback("created");
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
    pageLifetimes: CONTEXT.createLifetimeHooks(pLifetimes),
  });
}

export function definePage(setup, options) {
  setupPage(formatOptions(setup, options));
}
export function defineComponent(setup, options) {
  setupComponent(formatOptions(setup, options));
}
