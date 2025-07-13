import { isNonEmptyString, get, onceInvokable } from "../../utils/index";
import {
  captureSignal,
  isWatchable,
  subscribeStateOfSignal,
  useSignal,
  watch,
} from "../../state/signal";
import { isValueRefSignal } from "../../state/index";
import InstanceLifetimeScope from "../InstanceLifetimeScope";
import SetupContext from "../setup-context/SetupContext";
import { pageEventNames } from "./consts";

/**
 *
 * @param { SetupContext } setupCtx
 * @param { InstanceLifetimeScope } scope
 */
export default function createSettingUpContext(setupCtx, scope) {
  const mixInBehaviors = setupCtx.mixInBehaviors.bind(setupCtx);
  const exposedCtx = {
    isSettingUpOptions: !scope,
    isSettingUpInstance: !!scope,
    isPage: setupCtx.isPage,
    isComponent: setupCtx.isComponent,
    $this: setupCtx.instance || null,
    defineOptions: setupCtx.defineOptions.bind(setupCtx),
    defineRelation: setupCtx.defineRelation.bind(setupCtx),
    mixInBehaviors,
    mix: mixInBehaviors,
    provide: setupCtx.setProvidedData.bind(setupCtx, scope),
  };
  if (setupCtx.isPage) {
    pageEventNames.forEach((name) => {
      exposedCtx[`on${name}`] = setupCtx.addPageEventListener.bind(
        setupCtx,
        scope,
        name
      );
    });
  } else if (setupCtx.isComponent) {
    exposedCtx.onPageProvidedDataReady =
      setupCtx.subscribePageProvidedDataReady.bind(setupCtx, scope);
    exposedCtx.$emit =
      scope?.instance.triggerEvent.bind(scope.instance) || (() => {});
    exposedCtx.$props = setupCtx.getSetupProps.bind(setupCtx);
    exposedCtx.externalClasses = setupCtx.addExternalClasses.bind(setupCtx);
    exposedCtx.defineProps = onceInvokable(
      setupCtx.defineProperties.bind(setupCtx),
      "cannot define properties more than once for a component"
    );
    exposedCtx.inject = setupCtx.injectProvidedData.bind(setupCtx, scope);
    exposedCtx.expose = exposedCtx.defineExpose =
      setupCtx.defineExportObject.bind(setupCtx);
    exposedCtx.observe = setupCtx.addDataAndSignalObserver.bind(
      setupCtx,
      scope
    );
  }
  return Object.freeze(exposedCtx);
}

export function createDataBinder(instance) {
  let isSyncing = false;
  const signals = {};
  const unbinds = [];

  const instanceSetData = instance.setData.bind(instance);
  const updateData = (key, val) => isSyncing || instanceSetData({ [key]: val });
  const bind = (name, signal) => {
    const isValueRef = isValueRefSignal(signal);
    signals[name] = useSignal(signal);
    unbinds.push(
      subscribeStateOfSignal(signal, (payload) =>
        updateData(name, isValueRef ? payload.value.value : payload.value)
      )
    );
  };
  const sync = (dataKey) => {
    try {
      isSyncing = true;
      signals[dataKey]?.[1]?.(instance.data[dataKey]);
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

export function createMixObserver(
  src,
  observer,
  { instance, key, signals, indexesMap }
) {
  const instanceDataObserver = ({ payload }) => {
    observer.call(
      instance,
      ...src.map((s) => {
        if (isWatchable(s)) return captureSignal(s, true);
        if (isNonEmptyString(s)) return payload[indexesMap.get(s)];
        return undefined;
      })
    );
  };
  const signalsObserver = (values) => {
    observer.call(
      instance,
      ...src.map((s) => {
        if (isWatchable(s)) return values[indexesMap.get(s)];
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
