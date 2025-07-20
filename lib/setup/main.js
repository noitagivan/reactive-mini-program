import { runInEffectFreeScope } from "../state/EffectScope";
import {
  ComponentSetupBehavior,
  PageSetupBehavior,
  uuid,
} from "./etc/behaviors";
import { exposeActiveSetupContext } from "./etc/exposers";
import { formatSetupOptions } from "./etc/formatters";
import RuntimeContext from "./SetupRuntimeContext";

const CONTEXT = new RuntimeContext();

function setupPage({ setup, data: optData, ...optMethods }) {
  const ctx = CONTEXT.OptionsSetupContext.reset({ isPage: true });
  runInEffectFreeScope(() => CONTEXT.runSetup(setup, ctx));
  const observers = ctx.createObserversOption();
  const { data, methods } = ctx.formatDataAndMethods(optData, optMethods);
  const { behaviors, ...options } = ctx.formatOptions({ ...methods, data });
  options.data[uuid] = {
    runSetup: CONTEXT.runSetup.bind(CONTEXT, setup),
    setScope: CONTEXT.setPageScope,
    getScope: CONTEXT.getPageScope,
    resetScope: CONTEXT.resetInstanceLifetimeScope,
  };
  console.log("[[ PAGE ] Options Formatted ]", options, {
    behaviors,
    observers,
  });
  ctx.reset();

  Page({
    ...options,
    behaviors: [PageSetupBehavior(observers), ...behaviors],
    onLoad(opts) {
      CONTEXT.getPageScope(this.getPageId())
        .forwardInstanceLifetimeEvent(`load`, opts)
        .emit(`scopelifetimes/mounted`);
    },
    onUnload() {
      const pageId = this.getPageId();
      CONTEXT.getPageScope(pageId)?.stop();
      CONTEXT.setPageScope(pageId, null);
    },
  });
}

function setupComponent({
  setup,
  data: optData,
  observers: optObservers,
  methods: optMethods,
  ...opts
}) {
  const ctx = CONTEXT.OptionsSetupContext.reset({ isComponent: true });
  runInEffectFreeScope(() => CONTEXT.runSetup(setup, ctx));
  const properties = ctx.createPropertiesOption(opts);
  const observers = ctx.createObserversOption(optObservers);
  const { data, methods } = ctx.formatDataAndMethods(optData, optMethods);
  const { lifetimes, pageLifetimes } = ctx.createLifetimeOptions(opts);
  const { behaviors, ...options } = ctx.formatOptions({
    ...opts,
    properties,
    data,
    methods,
    observers,
    lifetimes,
    pageLifetimes,
  });
  options.data[uuid] = {
    options: opts,
    runSetup: CONTEXT.runSetup.bind(CONTEXT, setup),
    setScope: CONTEXT.setComponentScope,
    getScope: CONTEXT.getComponentScope,
    getParentScope: CONTEXT.getParentScopeOf,
    resetScope: CONTEXT.resetInstanceLifetimeScope,
  };
  console.log("[[ COMPONENT ] Options Formatted ]", options, { behaviors });
  ctx.reset();

  Component({
    ...options,
    behaviors: [ComponentSetupBehavior(), ...behaviors],
    lifetimes: {
      ...lifetimes,
      attached() {
        CONTEXT.getComponentScope(this)
          .forwardInstanceLifetimeEvent(`attached`)
          .emit(`scopelifetimes/mounted`);
      },
      detached() {
        CONTEXT.getComponentScope(this)?.stop();
        CONTEXT.setComponentScope(this, null);
      },
    },
  });
}

export const useActiveSetupContext = () => exposeActiveSetupContext(CONTEXT);
export function defineApp(setup) {}
export function definePage(setup, options) {
  setupPage(formatSetupOptions(setup, options));
}
export function defineComponent(setup, options) {
  setupComponent(formatSetupOptions(setup, options));
}

export const test = {
  b(obj) {
    return obj;
  },
};
