export const configOptionKeys = [
  "multipleSlots",
  "addGlobalClass",
  "styleIsolation",
  "pureDataPattern",
  "virtualHost",
];

export const internalBehaviors = [
  "wx://form-field",
  "wx://form-field-group",
  "wx://form-field-button",
  "wx://component-export",
];

export const relationTypes = ["parent", "child", "ancestor", "descendant"];
export const relationEventNames = ["linked", "unlinked", "linkChanged"];

export const scopeLifetimeNames = ["beforemounted", "mounted", "dispose"];
export const componentMountLifetimeNames = ["attached", "detached"];
export const onceLifetimeNames = [
  "created",
  "ready",
  ...componentMountLifetimeNames,
];
export const componentLifetimeNames = [...onceLifetimeNames, "moved", "error"];
export const componentPageLifetimeNames = [
  "show",
  "hide",
  "resize",
  "routeDone",
];
export const componentFullLifetimeNames = [
  ...componentLifetimeNames,
  ...componentPageLifetimeNames,
];

export const pageLifetimeMap = {
  load: ["onLoad", false],
  show: ["onShow", true],
  ready: ["onReady", true],
  hide: ["onHide", true],
  unload: ["onUnload", false],
  resize: ["onResize", true],
  routeDone: ["onRouteDone", true],
};
export const pageEventNames = [
  "PullDownRefresh",
  "ReachBottom",
  "PageScroll",
  "TabItemTap",
];
export const pageHookNames = [
  "AddToFavorites",
  "ShareAppMessage",
  "ShareTimeline",
  "SaveExitState",
];
