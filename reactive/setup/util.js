import { isFunction, isNonNullObject } from "../utils/index";

export const partialCLifetimes = ["ready", "moved", "error"];
export const cLifetimes = [
  "created",
  "attached",
  "detached",
  ...partialCLifetimes,
];
export const pLifetimes = ["show", "routeDone", "resize", "hide"];

export const formatOptions = (setup, options) => {
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
