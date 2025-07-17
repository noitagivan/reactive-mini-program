import { runInEffectFreeScope } from "../state/EffectScope";
import { ComponentBehavior, PageBehavior, formatOptions } from "./etc/index";
import RuntimeContext from "./RuntimeContext";

const CONTEXT = new RuntimeContext();

function setupPage({ setup, data: _data, ..._methods }) {
  const ctx = CONTEXT.OptionsSetupContext.reset({ isPage: true });
  runInEffectFreeScope(() => CONTEXT.runSetup(setup, ctx));
  const observers = ctx.createObserversOption();
  const { data, methods } = ctx.formatDataAndMethods(_data, _methods);
  const { behaviors, ...options } = ctx.formatOptions({ ...methods, data });
  console.log("[[ PAGE ] Options Formatted ]", options, {
    behaviors,
    observers,
  });
  ctx.reset();

  Page({
    ...options,
    behaviors: [PageBehavior(setup, observers, CONTEXT), ...behaviors],
    onUnload() {
      const pageId = this.getPageId();
      CONTEXT.getPageScope(pageId)?.stop();
      CONTEXT.setPageScope(pageId, null);
    },
  });
}

function setupComponent({
  setup,
  data: _data,
  observers: _observers,
  methods: _methods,
  ...opts
}) {
  const ctx = CONTEXT.OptionsSetupContext.reset({ isComponent: true });
  runInEffectFreeScope(() => CONTEXT.runSetup(setup, ctx));
  const properties = ctx.createPropertiesOption(opts);
  const observers = ctx.createObserversOption(_observers);
  const { data, methods } = ctx.formatDataAndMethods(_data, _methods);
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
  console.log("[[ COMPONENT ] Options Formatted ]", options, { behaviors });
  ctx.reset();

  Component({
    ...options,
    behaviors: [ComponentBehavior(setup, opts, CONTEXT), ...behaviors],
    lifetimes: {
      ...lifetimes,
      detached() {
        CONTEXT.getComponentScope(this)?.stop();
        CONTEXT.setComponentScope(this, null);
      },
    },
  });
}

export const useActiveSetupContext = () => CONTEXT.exposeActiveSetupContext();
export function defineApp(setup) {}
export function definePage(setup, options) {
  setupPage(formatOptions(setup, options));
}
export function defineComponent(setup, options) {
  setupComponent(formatOptions(setup, options));
}
