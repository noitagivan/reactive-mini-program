import { useActiveSetupContext } from "../main";

/**
 * [ onCreated ] 组件实例刚刚被创建时执行
 *
 * Map to: Component/lifetimes/created, Component/created
 *
 * Special map to:: Page/behavior/created
 *
 * @param {ParamLessCallback} handle 生命周期处理函数
 */
export function onCreated(handle) {
  useActiveSetupContext()?.on("created", handle);
}

/**
 * [ onAttached ] 组件实例进入页面节点树时执行
 *
 * Map to: Component/lifetimes/attached, Component/attached
 *
 * Special map to:: Page/behavior/attached
 *
 * @param {ParamLessCallback} handle 组件生命周期处理函数
 */
export function onAttached(handle) {
  useActiveSetupContext()?.on("attached", handle);
}

/**
 * @typedef {Record<string, string>} PageLoadOptions 打开当前页面路径中的参数
 */
/**
 * [ onLoad ] 页面加载时触发。
 *
 * 一个页面只会调用一次。
 *
 * Map to: Page/onLoad
 *
 * @param {EventHandle<PageLoadOptions>} handle 页面生命周期处理函数
 */
export function onLoad(handle) {
  useActiveSetupContext()?.on("load", handle);
}

/**
 * [ onShow ] 页面显示/切入前台时触发
 *
 * Map to: Page/onShow, Component/pageLifetimes/show
 *
 * @param {ParamLessCallback} handle 生命周期处理函数
 */
export function onShow(handle) {
  useActiveSetupContext()?.on("show", handle);
}

/**
 * [ onReady ] 页面初次渲染完成时触发；或组件渲染线程被初始化已经完成。
 *
 * 一个页面只会调用一次，代表页面已经准备妥当，可以和视图层进行交互。
 *
 * Map to: Page/onReady, Component/lifetimes/ready, Component/ready
 *
 * @param {ParamLessCallback} handle 生命周期处理函数
 */
export function onReady(handle) {
  useActiveSetupContext()?.on("ready", handle);
}

/**
 * [ onRouteDone ] 路由动画完成时触发。
 *
 * wx.navigateTo 页面完全推入后 或 wx.navigateBack 页面完全恢复时。
 *
 * Map to: Page/onRouteDone, Component/pageLifetimes/routeDone
 *
 * @param { (size) => void } handle 生命周期处理函数
 */
export function onRouteDone(handle) {
  useActiveSetupContext()?.on("routeDone", handle);
}

/**
 * [ onHide ] 页面隐藏/切入后台时触发。
 *
 * Map to: Page/onHide, Component/pageLifetimes/hide
 *
 * @param {ParamLessCallback} handle 生命周期处理函数
 */
export function onHide(handle) {
  useActiveSetupContext()?.on("hide", handle);
}

/**
 * [ onMoved ] 组件实例被移动到节点树另一个位置时执行
 *
 * Map to: Component/lifetimes/moved, Component/moved
 *
 * @param {ParamLessCallback} handle 生命周期处理函数
 */
export function onMoved(handle) {
  useActiveSetupContext()?.on("moved", handle);
}

/**
 * [ onDetached ] 组件实例被从页面节点树移除时执行
 *
 * Map to: Component/lifetimes/detached, Component/detached
 *
 * @param {ParamLessCallback} handle 组件生命周期处理函数
 */
export function onDetached(handle) {
  useActiveSetupContext()?.on("detached", handle);
}

/**
 * [ onUnload ] 页面卸载时触发。
 *
 * Map to: Page/onUnload
 *
 * @param {ParamLessCallback} handle 页面生命周期处理函数
 */
export function onUnload(handle) {
  useActiveSetupContext()?.on("unload", handle);
}
