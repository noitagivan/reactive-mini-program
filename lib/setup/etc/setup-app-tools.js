/**
 *
 * @template T
 * @param {string} key
 * @param {RMPVoidFunction<[T, T]>} handle
 */
export function subscribeGlobalData(key, handle) {}

/**
 *
 * @param  {...string} keys
 */
export function pickGlobalData(...keys) {}

/**
 *
 * @param {string} key
 * @param {PageInstance | ComponentInstance} instance
 * @param {string} dataKey
 */
export function mapGlobalData(key, instance, dataKey) {}

/**
 * @template T
 * @param {string} action
 * @param  {...any} payload
 * @returns {T}
 */
export function dispatchAppAction(action, ...payload) {}
