import { useActiveSetupContext } from "../main";

/**
 * [ behaviors ] 混入通用行为
 *
 * @param {string | string[]} ids
 * @param {...(string | string[])} more
 */
export function behaviors(ids, ...more) {
  useActiveSetupContext()?.settingUpContext?.behaviors?.(...ids, ...more);
}

/**
 * [ extClasses ] 定义组件接受的外部样式类
 *
 * @param {string | string[]} attrs
 * @param {...(string | string[])} more
 */
export function extClasses(attrs, ...more) {
  useActiveSetupContext()?.settingUpContext?.extClasses(...classnames, ...more);
}

/**
 * [ inject ] 注入父组件或祖先组件提供的数据
 *
 * @template T
 * @param {string | symbol} key
 * @param {T} [defaultValue = undefined]
 * @returns {ComputedSignalImpl<T>}
 */
export function inject(key, defaultValue) {
  useActiveSetupContext()?.settingUpContext?.inject(key, defaultValue);
}

/**
 * [ observe ] 观察组件、页面数据或 signal payload 的变化
 *
 * @template {ObserveSource} T
 * @param {T} source
 * @param {(...values: WatchValues<T>)=>void} callback
 * @returns {ParamlessFunction<boolean>}
 */
export function observe(source, callback) {
  useActiveSetupContext()?.settingUpContext?.observe(source, callback);
}

/**
 * [ provide ] 向子组件和后代组件提供数组
 *
 * @template T
 * @param {string | symbol} key
 * @param {T} data
 */
export function provide(key, data) {
  useActiveSetupContext()?.settingUpContext?.provide(key, data);
}

/**
 * [ relation ] 定义组件间关系
 *
 * @param {string} id
 * @param {RelationDescription} description
 */
export function relation(id, description) {
  useActiveSetupContext()?.settingUpContext?.defineRelation(id, description);
}
