import { createEffectScope, runInSilentScope } from "../state/EffectScope";
import { isFunction, isNonNullObject } from "../utils/index";
import { cLifetimes, partialCLifetimes, pLifetimes } from "./consts";
import GlobalContext from "./GlobalContext";
import InstanceScope from "./InstanceScope";
import SetupContex from "./SetupContex";

const CONTEXT = new GlobalContext();

const formatOptions = (setup, options) => {
  if (isFunction(setup)) {
    if (isNonNullObject(options)) return { ...options, setup };
    return { setup };
  } else if (isNonNullObject(setup)) {
    const { setup: setupFunc, ...opts } = setup;
    if (isFunction(setupFunc)) return { ...opts, setup: setupFunc };
    return { ...opts };
  }
  return {};
};

const setupPage = (options) => {
  const { setup, onLoad, onReady, onUnload } = options;
  const { onShow, onHide, onResize, onrouteDone } = options;

  const context = runInSilentScope(() =>
    CONTEXT.runSetup(setup, new SetupContex({ isPage: true }))
  );
  const { data, methods } = context.initDataAndMethods(options);
  context.reset();

  Page({
    ...methods,
    data,
    onLoad(opts) {
      const pageId = this.getPageId();
      const scope = new InstanceScope(this, {
        pageId,
        isPage: true,
        effectScope: createEffectScope(),
      }).run(() => CONTEXT.runSetup(setup, context), {
        setScope: (scope) => CONTEXT.setPageScope(pageId, scope),
        resetScope: () => CONTEXT.resetInstanceScope(),
      });
      console.log("lifetimes/onLoad", pageId, this);
      this.onReady = scope.setLifeTimeCallback("ready", onReady);
      this.onShow = scope.setLifeTimeCallback("show", onShow);
      this.onHide = scope.setLifeTimeCallback("hide", onHide);
      this.onResize = scope.setLifeTimeCallback("pageresize", onResize);
      this.onrouteDone = scope.setLifeTimeCallback("routeDone", onrouteDone);
      scope.setLifeTimeCallback("unload", onUnload);
      scope.setLifeTimeCallback("load", onLoad)(opts);
      scope.attachTo(null);
    },
    onUnload() {
      const pageId = this.getPageId();
      // console.log("onUnload", pageId);
      CONTEXT.getPageScope(pageId)
        ?.invokeLifeTimeCallback("unload")
        .invokeLifeTimeCallback("unmounted")
        .stop();
      CONTEXT.setPageScope(pageId, null);
    },
  });
};

const setupComponent = (options) => {
  const { setup, lifetimes, pageLifetimes } = options;
  const context = runInSilentScope(() =>
    CONTEXT.runSetup(setup, new SetupContex({ isComponent: true }))
  );
  const { data, methods } = context.initDataAndMethods(options);
  const {
    names: propNames,
    option: propsOption,
    values: defaultProps,
  } = context.componentProps;
  const properties = propsOption || options.properties || {};
  const observers = CONTEXT.settleObserversOption(
    propNames,
    context.componentObservers,
    options.observers
  );
  context.reset();

  Component({
    // ...options,
    properties,
    data,
    methods,
    observers,
    lifetimes: {
      ...CONTEXT.createLifetimeHooks(partialCLifetimes),
      created() {
        const scope = new InstanceScope(this, {
          pageId: this.getPageId(),
          isComponent: true,
          effectScope: createEffectScope(),
        })
          .useDefaultProps(defaultProps)
          .run(() => CONTEXT.runSetup(setup, context), {
            setScope: (scope) => CONTEXT.setComponentScope(this, scope),
            resetScope: () => CONTEXT.resetInstanceScope(),
          });
        console.log("lifetimes/created", scope.pageId, scope.getId());
        cLifetimes.forEach((lifetime) => {
          const optCbs = lifetimes?.[lifetime] || options[lifetime];
          scope.setLifeTimeCallback(lifetime, optCbs);
        });
        pLifetimes.forEach((lifetime) =>
          scope.setLifeTimeCallback(lifetime, pageLifetimes?.[lifetime])
        );
        scope.invokeLifeTimeCallback("created");
      },
      attached() {
        // console.log("lifetimes/attached", this.__wxExparserNodeId__, this);
        const scope = CONTEXT.getComponentScope(this);
        scope
          ?.invokeLifeTimeCallback("attached")
          .attachTo(CONTEXT.getParentComponentScopeOf(scope));
      },
      detached() {
        // console.log("lifetimes/detached", this.__wxExparserNodeId__);
        CONTEXT.getComponentScope(this)
          ?.invokeLifeTimeCallback("detached")
          .stop();
        CONTEXT.setComponentScope(this, null);
      },
    },
    pageLifetimes: CONTEXT.createLifetimeHooks(pLifetimes),
  });
};

export function definePage(setup, options) {
  setupPage(formatOptions(setup, options));
}

export function defineComponent(setup, options) {
  setupComponent(formatOptions(setup, options));
}

export function invokeDefinedPageMethod(instance, methodName, ...args) {
  const pageId = instance?.getPageId();
  if (pageId) {
    return CONTEXT.getPageScope(pageId)?.invokeMethod(methodName, ...args);
  }
}

export function invokeDefinedComponentMethod(component, methodName, ...args) {
  return CONTEXT.getComponentScope(component)?.invokeMethod(
    methodName,
    ...args
  );
}

export function useCurrentInstanceScope() {
  return CONTEXT.exposeInstanceScope();
}

export function useCurrentSetupContext() {
  return CONTEXT.exposeSetupContext();
}
