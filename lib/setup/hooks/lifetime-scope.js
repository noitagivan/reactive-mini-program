import { useActiveSetupContext } from "../main";

export function useApp() {
  return {};
}

/**
 * [ useCurrentPage ]
 *
 * @returns {PageInstance | null}
 */
export function useCurrentPage() {
  return useActiveSetupContext()?.lifetimeScope.instance;
}

/**
 * [ useCurrentInstance ]
 *
 * @returns {ComponentInstance | PageInstance | null}
 */
export function useCurrentInstance() {
  return useActiveSetupContext()?.lifetimeScope.instance;
}

/**
 * [ onBeforeMounted ] Lifetime Scope 在页面或组件 attached 时优先执行
 *
 * Priority exec before: page/behavior/attached, component/attached
 *
 * @param {ParamLessCallback} handle Lifetime Scope 生命周期处理函数
 */
export function onBeforeMounted(handle) {
  useActiveSetupContext()?.lifetimeScope?.on("beforemounted", handle);
}

/**
 * [ onMounted ] Lifetime Scope 在页面 onLoad 或组件 attached 时最后执行
 *
 * Final exec after: page/onLoad, component/attached
 *
 * @param {ParamLessCallback} handle Lifetime Scope 生命周期处理函数
 */
export function onMounted(handle) {
  useActiveSetupContext()?.lifetimeScope?.on("mounted", handle);
}

/**
 * [ onUnmounted ] Lifetime Scope 在页面 onUnload 或组件 detached 时最后执行
 *
 * Final exec after: page/onUnload, component/detached
 *
 * @param {ParamLessCallback} handle Lifetime Scope 生命周期处理函数
 */
export function onUnmounted(handle) {
  useActiveSetupContext()?.lifetimeScope?.on("dispose", handle);
}
