import {
  useCurrentSettingUpInstanceScope,
  useCurrentSetupContext,
} from "../setup/main";

const addPageLifetimeListener = (lifetime, handle) => {
  const context = useCurrentSetupContext();
  if (context.isPage) context.on?.(lifetime, handle);
};

const addComponentLifetimeListener = (lifetime, handle) => {
  const context = useCurrentSetupContext();
  if (context.isComponent) context.on?.(lifetime, handle);
};

/**
 * onLoad
 *
 * page/onLoad
 *
 * @param { () => void } handle 生命周期回调函数
 */
export function onLoad(handle) {
  addPageLifetimeListener("load", handle);
}

/**
 * onUnload
 *
 * page/onUnload
 *
 * @param { () => void } handle 生命周期回调函数
 */
export function onUnload(handle) {
  addPageLifetimeListener("unload", handle);
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
  useCurrentSetupContext()?.on?.("ready", handle);
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
  useCurrentSetupContext()?.on?.("show", handle);
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
  useCurrentSetupContext()?.on?.("hide", handle);
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
  addComponentLifetimeListener("created", handle);
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
  addComponentLifetimeListener("attached", handle);
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
  addComponentLifetimeListener("detached", handle);
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
  addComponentLifetimeListener("moved", handle);
}

/**
 * onPageResize
 *
 * page/onResize
 * component/pageLifetimes/resize
 */
export function onPageResize(handle) {
  useCurrentSetupContext()?.on?.("resize", handle);
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
  useCurrentSetupContext()?.on?.("routeDone", handle);
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
  addComponentLifetimeListener("error", handle);
}

/**
 * onMounted
 *
 * after page/onLoad
 *
 * after component/attached
 *
 * @param { () => void } handle 生命周期回调函数
 */
export function onMounted(handle) {
  useCurrentSettingUpInstanceScope()?.onMounted(() => handle());
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
  useCurrentSettingUpInstanceScope()?.onDispose(() => handle());
}

export function onPullDownRefresh(handle) {
  useCurrentSetupContext()?.listen?.("PullDownRefres", handle);
}
export function onReachBottom(handle) {
  useCurrentSetupContext()?.listen?.("ReachBottom", handle);
}
export function onPageScroll(handle) {
  useCurrentSetupContext()?.listen?.("PageScroll", handle);
}
export function onTabItemTap(handle) {
  useCurrentSetupContext()?.listen?.("TabItemTap", handle);
}
