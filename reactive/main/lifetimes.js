import {
  useCurrentSettingUpInstanceScope,
  useCurrentSetupContext,
} from "./setup";

const addPageLifetimeListener = (lifetime, listener) => {
  const context = useCurrentSetupContext();
  if (context.isPage) context.addLifetimeListener?.(lifetime, listener);
};

const addComponentLifetimeListener = (lifetime, listener) => {
  const context = useCurrentSetupContext();
  if (context.isComponent) context.addLifetimeListener?.(lifetime, listener);
};

/**
 * onLoad
 *
 * page/onLoad
 *
 * @param { () => void } listener 生命周期回调函数
 */
export function onLoad(listener) {
  addPageLifetimeListener("load", listener);
}

/**
 * onUnload
 *
 * page/onUnload
 *
 * @param { () => void } listener 生命周期回调函数
 */
export function onUnload(listener) {
  addPageLifetimeListener("unload", listener);
}

/**
 * onReady
 *
 * page/onReady
 *
 * component/lifetimes/ready
 *
 * component/ready
 *
 * @param { () => void } listener 生命周期回调函数
 */
export function onReady(listener) {
  useCurrentSetupContext()?.addLifetimeListener?.("ready", listener);
}

/**
 * onShow
 *
 * page/onShow
 *
 * component/pageLifetimes/show
 *
 * @param { () => void } listener 生命周期回调函数
 */
export function onShow(listener) {
  useCurrentSetupContext()?.addLifetimeListener?.("show", listener);
}

/**
 * onHide
 *
 * page/onHide
 *
 * component/pageLifetimes/hide
 *
 * @param { () => void } listener 生命周期回调函数
 */
export function onHide(listener) {
  useCurrentSetupContext()?.addLifetimeListener?.("hide", listener);
}

/**
 * onCreated
 *
 * component/lifetimes/created
 *
 * component/created
 *
 * @param { () => void } listener 生命周期回调函数
 */
export function onCreated(listener) {
  addComponentLifetimeListener("created", listener);
}

/**
 * onAttached
 *
 * component/lifetimes/attached
 *
 * component/attached
 *
 * @param { () => void } listener 生命周期回调函数
 */
export function onAttached(listener) {
  addComponentLifetimeListener("attached", listener);
}

/**
 * onDetached
 *
 * component/lifetimes/detached
 *
 * component/detached
 *
 * @param { () => void } listener 生命周期回调函数
 */
export function onDetached(listener) {
  addComponentLifetimeListener("detached", listener);
}

/**
 * onMoved
 *
 * component/lifetimes/moved
 *
 * component/moved
 *
 * @param { () => void } listener 生命周期回调函数
 */
export function onMoved(listener) {
  addComponentLifetimeListener("moved", listener);
}

/**
 * onPageResize
 *
 * page/onResize
 * component/pageLifetimes/resize
 */
export function onPageResize(listener) {
  useCurrentSetupContext()?.addLifetimeListener?.("pageresize", listener);
}

/**
 * onrouteDone
 *
 * page/onrouteDone
 *
 * component/pageLifetimes/routeDone
 *
 * @param { () => void } listener 生命周期回调函数
 */
export function onrouteDone(listener) {
  useCurrentSetupContext()?.addLifetimeListener?.("routeDone", listener);
}

/**
 * onComponentError
 *
 * component/lifetimes/error
 *
 * component/error
 *
 * @param { (error: Error) => void } listener 生命周期回调函数
 */
export function onComponentError(listener) {
  addComponentLifetimeListener("error", listener);
}

/**
 * onMounted
 *
 * after page/onLoad
 *
 * after component/attached
 *
 * @param { () => void } listener 生命周期回调函数
 */
export function onMounted(listener) {
  useCurrentSettingUpInstanceScope()?.onAttached(listener);
}

/**
 * onUnmounted
 *
 * after page/onUnload
 *
 * after component/detached
 *
 * @param { () => void } listener 生命周期回调函数
 */
export function onUnmounted(listener) {
  useCurrentSettingUpInstanceScope()?.onDispose(listener);
}
