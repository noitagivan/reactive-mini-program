import { isFunction, isNonEmptyString, isString } from "./index";

/**
 * @template T
 * @typedef {object} Event
 * @property {string|symbol} type 事件名或标识（字符串或 Symbol
 * @property {EventBus | any} [target]
 * @property {T}  payload 事件携带的数据
 * @property {number} [timestamp] 时间戳
 */

export default class EventBus {
  #eventMap = new Map();
  #withTimestamp = false;
  #shouldMatchWildcard = true;

  /**
   * @param {boolean} [withTimestamp=false] 创建 Event 对象时是否带时间错
   * @param {boolean} [shouldMatchWildcard] 是否支持通配订阅
   */
  constructor(withTimestamp = false, shouldMatchWildcard = true) {
    this.#withTimestamp = !!withTimestamp;
    this.#shouldMatchWildcard = shouldMatchWildcard !== false;
  }

  /**
   * 订阅事件
   * @param {string|symbol} eventType 事件名或标识（字符串或 Symbol）
   * @param {EventHandle<Event>} handle 事件处理函数
   * @returns {ParamLessCallback} 取消订阅的函数
   */
  on(eventType, handle) {
    if (isFunction(handle)) {
      if (!this.#eventMap.has(eventType)) {
        this.#eventMap.set(eventType, new Set());
      }
      const handles = this.#eventMap.get(eventType);
      handles.add(handle);

      // 返回取消订阅的函数
      return this.off.bind(this, eventType, handle);
    }
    return () => {};
  }

  /**
   * 只订阅一次事件
   * @param {string|symbol} eventType 事件名或标识（字符串或 Symbol）
   * @param {EventHandle<Event>} handle 事件处理函数
   * @returns {ParamLessCallback} 取消订阅的函数
   */
  once(eventName, handle) {
    const onceWrapper = (...args) => {
      handle(...args);
      this.off(eventName, onceWrapper);
    };
    return this.on(eventName, onceWrapper);
  }

  /**
   * 触发事件
   * @template T
   * @param {string|symbol} eventType 事件名或标识（字符串或 Symbol）
   * @param {T} payload 传递给处理函数的参数（可选）
   * @param {EventBus | any} [target=undefined]
   */
  emit(eventType, payload, target = undefined) {
    target = target === undefined ? this : target;
    /**
     * @type {Event<T>}
     */
    const event = {
      type: eventType,
      payload,
    };
    if (target) event.target = target;
    if (this.#withTimestamp) event.timestamp = Date.now();

    const exactHandlers = this.#eventMap.get(eventType);
    if (exactHandlers?.size) {
      exactHandlers.forEach((handle) => handle(event));
    }
    if (
      this.#shouldMatchWildcard &&
      isNonEmptyString(eventType) &&
      eventType.includes("/")
    ) {
      const parts = eventType.split(this.separator);
      parts.pop();
      while (parts.length) {
        const wildcardEventName = [...parts, "*"].join("/");
        const wildcardHandlers = this.#eventMap.get(wildcardEventName);
        if (wildcardHandlers?.size) {
          wildcardHandlers.forEach((handle) => handle(event));
        }
        parts.pop();
      }
    }
    return this;
  }

  /**
   * 取消订阅特定事件的所有处理函数
   * @param {string|symbol} eventType 事件名或标识（字符串或 Symbol）
   * @param {EventHandle<Event>} [handle] 事件处理函数，传入则精确匹配，否则批量取消
   */
  off(eventType, handle) {
    if (isFunction(handle)) {
      const handles = this.#eventMap.get(eventType);
      handles?.delete(handle);
      if (handles?.size === 0) {
        this.#eventMap.delete(eventType);
      }
    } else {
      this.#eventMap.delete(eventType);
    }
    return this;
  }

  /**
   * 取消某个命名空间下的所有事件（自动补充分隔符）
   * @example
   * - `offNamespace('user')` → 取消 'user/' 开头的所有事件
   * - `offNamespace('user/')` → 同上
   *
   * @requires shouldMatchWildcard
   *
   * @param {string} namespace
   */
  offNamespace(namespace) {
    // 自动补充分隔符（如 'user' → 'user/'）
    if (this.#shouldMatchWildcard && isNonEmptyString(namespace)) {
      const normalize = namespace.endsWith("/") ? namespace : namespace + "/";
      for (const eventType of this.#eventMap.keys()) {
        if (isString(eventType) && eventType.startsWith(normalize)) {
          this.off(eventType);
        }
      }
    }
    return this;
  }

  /**
   * 清除所有事件监听
   */
  clear() {
    this.#eventMap.clear();
    return this;
  }
}
