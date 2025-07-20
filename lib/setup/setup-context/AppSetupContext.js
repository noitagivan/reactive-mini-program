import { interpretSignal, isSignal } from "../../state/index";
import { emitSignal } from "../../state/signal";
import { hasOwnProp, isFunction, isPlainObject } from "../../utils/index";

export default class AppSetupContext {
  setupRecords = null;
  setupMethods = null;
  setupSignals = null;
  providedData = null;

  constructor(setupRecords) {
    const setupMethods = {};
    const setupSignals = {};
    const providedData = {};
    if (isPlainObject(setupRecords)) {
      Object.entries(setupRecords).forEach(([key, record]) => {
        if (isSignal(record)) {
          setupSignals[key] = record;
        } else if (isFunction(record)) {
          setupMethods[key] = record;
        } else {
          providedData[key] = record;
        }
      });
    }
    this.setupRecords = setupRecords;
    this.setupMethods = setupMethods;
    this.setupSignals = setupSignals;
    this.providedData = providedData;
  }

  formatDataAndMethods() {
    const { setupSignals, providedData, setupMethods } = this;
    class GlobalDataHandler {
      get(t, p, r) {
        if (hasOwnProp(setupSignals, p)) {
          return interpretSignal(providedData[p], true);
        }
        if (hasOwnProp(providedData, p)) {
          return providedData[p];
        }
        return t[p];
      }
      set(t, p, v, r) {
        if (hasOwnProp(setupSignals, p)) {
          emitSignal(providedData[p], { value: v });
        } else if (hasOwnProp(providedData, p)) {
          providedData[p] = v;
        }
        t[p] = v;
        return true;
      }
      deleteProperty(t, p, r) {
        if (hasOwnProp(setupSignals, p) || hasOwnProp(providedData, p)) {
          return false;
        }
        return delete t[p];
      }
    }

    const globalData = new Proxy(
      { ...setupSignals, ...providedData },
      new GlobalDataHandler()
    );
    return { globalData, setupMethods };
  }
}
