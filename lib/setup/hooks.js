import { useActiveSetupContext } from "./main";

/**
 * onLoad
 *
 * page/onLoad
 *
 * @param { () => void } handle 生命周期回调函数
 */
export function onLoad(handle) {
  useActiveSetupContext()?.on("load", handle);
}

/**
 * onUnload
 *
 * page/onUnload
 *
 * @param { () => void } handle 生命周期回调函数
 */
export function onUnload(handle) {
  useActiveSetupContext()?.on("unload", handle);
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
 * @param { () => void } handle 生命周期回调函数
 */
export function onReady(handle) {
  useActiveSetupContext()?.on("ready", handle);
}

/**
 * onShow
 *
 * page/onShow
 *
 * component/pageLifetimes/show
 *
 * @param { () => void } handle 生命周期回调函数
 */
export function onShow(handle) {
  useActiveSetupContext()?.on("show", handle);
}

/**
 * onHide
 *
 * page/onHide
 *
 * component/pageLifetimes/hide
 *
 * @param { () => void } handle 生命周期回调函数
 */
export function onHide(handle) {
  useActiveSetupContext()?.on("hide", handle);
}

/**
 * onCreated
 *
 * component/lifetimes/created
 *
 * component/created
 *
 * @param { () => void } handle 生命周期回调函数
 */
export function onCreated(handle) {
  useActiveSetupContext()?.on("created", handle);
}

/**
 * onAttached
 *
 * component/lifetimes/attached
 *
 * component/attached
 *
 * @param { () => void } handle 生命周期回调函数
 */
export function onAttached(handle) {
  useActiveSetupContext()?.on("attached", handle);
}

/**
 * onDetached
 *
 * component/lifetimes/detached
 *
 * component/detached
 *
 * @param { () => void } handle 生命周期回调函数
 */
export function onDetached(handle) {
  useActiveSetupContext()?.on("detached", handle);
}

/**
 * onMoved
 *
 * component/lifetimes/moved
 *
 * component/moved
 *
 * @param { () => void } handle 生命周期回调函数
 */
export function onMoved(handle) {
  useActiveSetupContext()?.on("moved", handle);
}

/**
 * onPageResize
 *
 * page/onResize
 * component/pageLifetimes/resize
 */
export function onPageResize(handle) {
  useActiveSetupContext()?.on("resize", handle);
}

/**
 * onRouteDone
 *
 * page/onRouteDone
 *
 * component/pageLifetimes/routeDone
 *
 * @param { () => void } handle 生命周期回调函数
 */
export function onRouteDone(handle) {
  useActiveSetupContext()?.on("routeDone", handle);
}

/**
 * onComponentError
 *
 * component/lifetimes/error
 *
 * component/error
 *
 * @param { (error: Error) => void } handle 生命周期回调函数
 */
export function onComponentError(handle) {
  useActiveSetupContext()?.on("error", handle);
}

/**
 * onBeforeMounted
 *
 * after page/onLoad
 *
 * after component/attached
 *
 * @param { () => void } handle 生命周期回调函数
 */
export function onBeforeMounted(handle) {
  useActiveSetupContext()?.instanceLifetimeScope?.on("beforemounted", handle);
}

/**
 * onMounted
 *
 * after page/behavior/attached
 *
 * after component/attached
 *
 * @param { () => void } handle 生命周期回调函数
 */
export function onMounted(handle) {
  useActiveSetupContext()?.instanceLifetimeScope?.on("mounted", handle);
}

/**
 * onUnmounted
 *
 * after page/onUnload
 *
 * after component/detached
 *
 * @param { () => void } handle 生命周期回调函数
 */
export function onUnmounted(handle) {
  useActiveSetupContext()?.instanceLifetimeScope?.on("dispose", handle);
}

export function onPullDownRefresh(handle) {
  useActiveSetupContext()?.on("PullDownRefres", handle);
}
export function onReachBottom(handle) {
  useActiveSetupContext()?.on("ReachBottom", handle);
}
export function onPageScroll(handle) {
  useActiveSetupContext()?.on("PageScroll", handle);
}
export function onTabItemTap(handle) {
  useActiveSetupContext()?.on("TabItemTap", handle);
}
