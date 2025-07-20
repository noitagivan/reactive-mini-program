import { useActiveSetupContext } from "../main";

/**
 * @typedef {{windowWidth: number; windowHeight: number;}} PageSize 打开当前页面路径中的参数
 * @typedef {{size: PageSize}} PageResizePayload 打开当前页面路径中的参数
 */
/**
 * [ onPageResize ] 页面尺寸改变时触发；组件所在的页面尺寸变化时执行。
 *
 * Map to: Page/onResize, Component/pageLifetimes/resize
 *
 * @param {EventHandle<PageResizePayload>} handle 生命周期处理函数
 */
export function onPageResize(handle) {
  useActiveSetupContext()?.on("resize", handle);
}

/**
 * [ onComponentError ] 当组件方法抛出错误时执行
 *
 * Map to: Component/lifetimes/error, Component/error
 *
 * @param {EventHandle<Error>} handle 生命周期处理函数
 */
export function onComponentError(handle) {
  useActiveSetupContext()?.on("error", handle);
}

/**
 * [ onPullDownRefresh ] 监听用户下拉刷新事件
 *
 * Map to: Page/onPullDownRefresh
 *
 * @param {ParamLessCallback} handle
 */
export function onPullDownRefresh(handle) {
  useActiveSetupContext()?.on("PullDownRefres", handle);
}

/**
 * [ onReachBottom ] 监听用户上拉触底事件
 *
 * Map to: Page/onReachBottom
 *
 * @param {ParamLessCallback} handle
 */
export function onReachBottom(handle) {
  useActiveSetupContext()?.on("ReachBottom", handle);
}

/**
 * [ onPageScroll ] 监听用户滑动页面事件
 *
 * Map to: Page/onPageScroll
 *
 * @param {EventHandle<PageScrollEvent>} handle
 */
export function onPageScroll(handle) {
  useActiveSetupContext()?.on("PageScroll", handle);
}

/**
 * [ onTabItemTap ] 点击 tab 时触发
 *
 * Map to: Page/onTabItemTap
 *
 * @param {EventHandle<TabItemTapEvent>} handle
 */
export function onTabItemTap(handle) {
  useActiveSetupContext()?.on("TabItemTap", handle);
}
