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
      // console.log("onLoad", pageId, this);
      const scope = new InstanceScope(this, {
        pageId,
        isPage: true,
        effectScope: createEffectScope(),
      }).run(() => CONTEXT.runSetup(setup, context), {
        setScope: (scope) => CONTEXT.setPageScope(pageId, scope),
        resetScope: () => CONTEXT.resetSetupInstanceScope(),
      });
      this.onReady = scope.setLifeTimeCallback("ready", onReady);
      this.onShow = scope.setLifeTimeCallback("show", onShow);
      this.onHide = scope.setLifeTimeCallback("hide", onHide);
      this.onResize = scope.setLifeTimeCallback("pageresize", onResize);
      this.onrouteDone = scope.setLifeTimeCallback("routeDone", onrouteDone);
      scope.setLifeTimeCallback("unload");
      scope.setLifeTimeCallback("unmounted");
      scope.setLifeTimeCallback("load", onLoad)(opts);
      scope.setLifeTimeCallback("mounted")();
    },
    onUnload() {
      const pageId = this.getPageId();
      // console.log("onUnload", pageId);
      const scope = CONTEXT.getPageScope(pageId);
      if (scope) {
        scope?.invokeLifeTimeCallback("unload");
        scope?.invokeLifeTimeCallback("unmounted");
        scope.stop();
        CONTEXT.setPageScope(pageId, null);
      }
      onUnload?.call(this);
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
        // console.log("lifetimes/created", this.__wxExparserNodeId__);
        const scope = new InstanceScope(this, {
          pageId: this.getPageId(),
          isComponent: true,
          effectScope: createEffectScope(),
        })
          .useDefaultProps(defaultProps)
          .run(() => CONTEXT.runSetup(setup, context), {
            setScope: (scope) => CONTEXT.setComponentScope(this, scope),
            resetScope: () => CONTEXT.resetSetupInstanceScope(),
          });

        cLifetimes.forEach((lifetime) => {
          const optCbs = lifetimes?.[lifetime] || options[lifetime];
          scope.setLifeTimeCallback(lifetime, optCbs);
        });
        pLifetimes.forEach((lifetime) =>
          scope.setLifeTimeCallback(lifetime, pageLifetimes?.[lifetime])
        );
        scope?.invokeLifeTimeCallback("created");
      },
      attached() {
        console.log("lifetimes/attached", this, this.selectOwnerComponent());
        const scope = CONTEXT.getComponentScope(this);
        if (scope) {
          scope?.invokeLifeTimeCallback("attached");
          scope?.invokeLifeTimeCallback("mounted");
        }
      },
      detached() {
        // console.log("lifetimes/detached", this.__wxExparserNodeId__);
        const scope = CONTEXT.getComponentScope(this);
        if (scope) {
          scope?.invokeLifeTimeCallback("detached");
          scope?.invokeLifeTimeCallback("unmounted");
          scope.stop();
          CONTEXT.setComponentScope(this, null);
        }
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

export function useCurrentSetupInstanceScope() {
  return CONTEXT.exposeSetupInstanceScope();
}

export function useCurrentSetupContext() {
  return CONTEXT.exposeSetupContext();
}
