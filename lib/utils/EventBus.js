import { isFunction, isNonEmptyString, isString } from "./index";

export default class EventBus {
  #eventMap = new Map();
  #withTimestamp = false;
  #shouldMatchWildcard = true;

  constructor(withTimestamp = false, shouldMatchWildcard = true) {
    this.#withTimestamp = !!withTimestamp;
    this.#shouldMatchWildcard = shouldMatchWildcard !== false;
  }

  /**
   * 订阅事件
   * @param { string | symbol } eventType 事件名（字符串或 Symbol）
   * @param { (payload) => void } handle 事件处理函数
   * @returns 取消订阅的函数
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

  // 只监听一次
  once(eventName, handle) {
    const onceWrapper = (...args) => {
      handle(...args);
      this.off(eventName, onceWrapper);
    };
    this.on(eventName, onceWrapper);
  }

  /**
   * 触发事件
   * @param eventType 事件名
   * @param payload 传递给处理函数的参数（可选）
   */
  emit(eventType, payload, target = null) {
    const event = {
      target: target || this,
      type: eventType,
      payload,
    };
    if (this.#withTimestamp) event.timestamp = Date.now();

    const exactHandlers = this.#eventMap.get(eventType);
    if (exactHandlers?.size) {
      exactHandlers.forEach((handle) => handle(event));
    }
    if (
      this.#shouldMatchWildcard &&
      isString(eventType) &&
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
   * @param { string | symbol } eventType 事件名
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
   */
  offNamespace(namespace) {
    // 自动补充分隔符（如 'user' → 'user/'）
    if (isNonEmptyString(namespace)) {
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
