import {
  isInternalSignalCarrier,
  isSignalPayloadRef,
  useSignal,
  interpretSignal,
  isSignal,
  trackSignal,
  watch,
} from "../../state/index";
import { isNonEmptyString, get, onceInvokable } from "../../utils/index";
import createInstanceLifetimeScope from "../InstanceLifetimeScope";
import SetupContext from "../setup-context/SetupContext";
import { pageEventNames } from "./constants";

/**
 * @param {SetupContext} setupCtx
 * @param {ReturnType<createInstanceLifetimeScope>} scope
 */
export function createSettingUpContext(setupCtx, scope) {
  const exposedCtx = {
    isSettingUpOptions: !scope,
    isSettingUpInstance: !!scope,
    isPage: setupCtx.isPage,
    isComponent: setupCtx.isComponent,
    $this: setupCtx.instance || null,
    defineOptions: setupCtx.defineOptions.bind(setupCtx),
    behaviors: setupCtx.mixInBehaviors.bind(setupCtx),
    provide: setupCtx.setProvidedData.bind(setupCtx, scope),
  };
  if (setupCtx.isPage) {
    pageEventNames.forEach((name) => {
      exposedCtx[`on${name}`] = setupCtx.addPageEventHandle.bind(
        setupCtx,
        scope,
        name
      );
    });
  } else if (setupCtx.isComponent) {
    exposedCtx.$emit =
      scope?.context.instance?.triggerEvent.bind(scope?.context.instance) ||
      (() => {});
    exposedCtx.extClasses = setupCtx.addExternalClasses.bind(setupCtx);
    exposedCtx.defineRelation = setupCtx.defineRelation.bind(setupCtx);
    exposedCtx.defineProps = onceInvokable(
      setupCtx.defineProperties.bind(setupCtx),
      "cannot define properties more than once for a component"
    );
    exposedCtx.inject = setupCtx.injectProvidedData.bind(setupCtx, scope);
    exposedCtx.defineExpose = setupCtx.defineExportObject.bind(setupCtx);
    exposedCtx.observe = setupCtx.addMixedObserver.bind(setupCtx, scope);
  }
  return Object.freeze(exposedCtx);
}

/**
 *
 * @param {object} instance - 页面或组件实例
 * @returns
 */
export function createDataBinder(instance) {
  let isSyncing = false;
  const signals = {};
  const unbinds = [];

  const instanceSetData = instance.setData.bind(instance);
  const updateData = (key, val) => isSyncing || instanceSetData({ [key]: val });
  const bind = (name, signal) => {
    signals[name] = signal;
    unbinds.push(
      trackSignal(signal, (payload) => updateData(name, payload.value))
    );
  };
  const sync = (dataKey) => {
    try {
      isSyncing = true;
      const signal = signals[dataKey];
      if (isInternalSignalCarrier(signal)) {
        if (isSignalPayloadRef(signal)) {
          signal.value = instance.data[dataKey];
        } else Object.assign(signal, instance.data[dataKey]);
      } else useSignal(signal)?.[1]?.(instance.data[dataKey]);
    } catch (error) {
      throw error;
    } finally {
      isSyncing = false;
    }
  };

  const setData = (data) => {
    if (data && typeof data === "object") {
      instanceSetData(data, () =>
        Object.keys(data).forEach((key) => sync(key.split(".")[0]))
      );
    }
  };

  return { setData, bind, unbinds };
}

/**
 * @typedef {object} CreateMixedObserverContext
 * @property {object} instance - 页面或组件实例
 * @property {string} key - Data Observer 标识
 * @property {Array<()=>any|Record<string,any>>} signals - 信号
 * @property {Map<string|()=>any|Record<string,any>, number>} indexesMap - 索引字典
 */

/**
 * @param {string|()=>any|Record<string,any>|Array<string|()=>any|Record<string,any>>} src
 * @param {(...values:any[])=>void} observer
 * @param {CreateMixedObserverContext} ctx
 * @returns
 */
export function createMixedObserver(
  src,
  observer,
  { instance, key, signals, indexesMap }
) {
  const instanceDataObserver = ({ payload }) => {
    observer.call(
      instance,
      ...src.map((s) => {
        if (isSignal(s)) return interpretSignal(s, true);
        if (isNonEmptyString(s)) return payload[indexesMap.get(s)];
        return s;
      })
    );
  };
  const signalsObserver = (values) => {
    observer.call(
      instance,
      ...src.map((s) => {
        if (isSignal(s)) return values[indexesMap.get(s)];
        if (isNonEmptyString(s)) return get(instance.data, s);
        return undefined;
      })
    );
  };
  const unobserve = instance.eventBus.on(
    `datachange/${key}`,
    instanceDataObserver
  );
  const unwatch = watch(signals, signalsObserver).stop;
  return () => (unobserve(), unwatch());
}
