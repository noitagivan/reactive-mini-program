import {
  useCurrentSettingUpInstanceSetupScope,
  useActiveSetupContext,
} from "./main";

/**
 * onLoad
 *
 * page/onLoad
 *
 * @param { () => void } handler 生命周期回调函数
 */
export function onLoad(handler) {
  useActiveSetupContext()?.on("load", handler);
}

/**
 * onUnload
 *
 * page/onUnload
 *
 * @param { () => void } handler 生命周期回调函数
 */
export function onUnload(handler) {
  useActiveSetupContext()?.on("unload", handler);
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
 * @param { () => void } handler 生命周期回调函数
 */
export function onReady(handler) {
  useActiveSetupContext()?.on("ready", handler);
}

/**
 * onShow
 *
 * page/onShow
 *
 * component/pageLifetimes/show
 *
 * @param { () => void } handler 生命周期回调函数
 */
export function onShow(handler) {
  useActiveSetupContext()?.on("show", handler);
}

/**
 * onHide
 *
 * page/onHide
 *
 * component/pageLifetimes/hide
 *
 * @param { () => void } handler 生命周期回调函数
 */
export function onHide(handler) {
  useActiveSetupContext()?.on("hide", handler);
}

/**
 * onCreated
 *
 * component/lifetimes/created
 *
 * component/created
 *
 * @param { () => void } handler 生命周期回调函数
 */
export function onCreated(handler) {
  useActiveSetupContext()?.on("created", handler);
}

/**
 * onAttached
 *
 * component/lifetimes/attached
 *
 * component/attached
 *
 * @param { () => void } handler 生命周期回调函数
 */
export function onAttached(handler) {
  useActiveSetupContext()?.on("attached", handler);
}

/**
 * onDetached
 *
 * component/lifetimes/detached
 *
 * component/detached
 *
 * @param { () => void } handler 生命周期回调函数
 */
export function onDetached(handler) {
  useActiveSetupContext()?.on("detached", handler);
}

/**
 * onMoved
 *
 * component/lifetimes/moved
 *
 * component/moved
 *
 * @param { () => void } handler 生命周期回调函数
 */
export function onMoved(handler) {
  useActiveSetupContext()?.on("moved", handler);
}

/**
 * onPageResize
 *
 * page/onResize
 * component/pageLifetimes/resize
 */
export function onPageResize(handler) {
  useActiveSetupContext()?.on("resize", handler);
}

/**
 * onRouteDone
 *
 * page/onRouteDone
 *
 * component/pageLifetimes/routeDone
 *
 * @param { () => void } handler 生命周期回调函数
 */
export function onRouteDone(handler) {
  useActiveSetupContext()?.on("routeDone", handler);
}

/**
 * onComponentError
 *
 * component/lifetimes/error
 *
 * component/error
 *
 * @param { (error: Error) => void } handler 生命周期回调函数
 */
export function onComponentError(handler) {
  useActiveSetupContext()?.on("error", handler);
}

/**
 * onBeforeMounted
 *
 * after page/onLoad
 *
 * after component/attached
 *
 * @param { () => void } handler 生命周期回调函数
 */
export function onBeforeMounted(handler) {
  useCurrentSettingUpInstanceSetupScope()?.on("beforemounted", handler);
}

/**
 * onMounted
 *
 * after page/onLoad
 *
 * after component/attached
 *
 * @param { () => void } handler 生命周期回调函数
 */
export function onMounted(handler) {
  useCurrentSettingUpInstanceSetupScope()?.on("mounted", handler);
}

/**
 * onUnmounted
 *
 * after page/onUnload
 *
 * after component/detached
 *
 * @param { () => void } handler 生命周期回调函数
 */
export function onUnmounted(handler) {
  useCurrentSettingUpInstanceSetupScope()?.on("dispose", handler);
}

export function onPullDownRefresh(handler) {
  useActiveSetupContext()?.on("PullDownRefres", handler);
}
export function onReachBottom(handler) {
  useActiveSetupContext()?.on("ReachBottom", handler);
}
export function onPageScroll(handler) {
  useActiveSetupContext()?.on("PageScroll", handler);
}
export function onTabItemTap(handler) {
  useActiveSetupContext()?.on("TabItemTap", handler);
}
