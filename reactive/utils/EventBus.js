import { isFunction, isNonEmptyString, isString } from "./index";

export default class EventBus {
  #events = new Map();
  #withTimestamp = false;
  #shouldMatchWildcard = true;

  constructor(withTimestamp = false, shouldMatchWildcard = true) {
    this.#withTimestamp = !!withTimestamp;
    this.#shouldMatchWildcard = shouldMatchWildcard !== false;
  }

  /**
   * 订阅事件
   * @param { string | symbol } eventType 事件名（字符串或 Symbol）
   * @param { (payload) => void } handler 事件处理函数
   * @returns 取消订阅的函数
   */
  on(eventType, handler) {
    if (isFunction(handler)) {
      if (!this.#events.has(eventType)) {
        this.#events.set(eventType, new Set());
      }
      const handlers = this.#events.get(eventType);
      handlers.add(handler);

      // 返回取消订阅的函数
      return this.off.bind(this, eventType, handler);
    }
    return () => {};
  }

  // 只监听一次
  once(eventName, handler) {
    const onceWrapper = (...args) => {
      handler(...args);
      this.off(eventName, onceWrapper);
    };
    this.on(eventName, onceWrapper);
  }

  /**
   * 触发事件
   * @param eventType 事件名
   * @param payload 传递给处理函数的参数（可选）
   */
  emit(eventType, payload) {
    const event = {
      type: eventType,
      payload,
    };
    if (this.#withTimestamp) event.timestamp = Date.now();

    const exactHandlers = this.#events.get(eventType);
    if (exactHandlers?.size) {
      exactHandlers.forEach((handler) => handler(event));
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
        const wildcardHandlers = this.#events.get(wildcardEventName);
        if (wildcardHandlers?.size) {
          wildcardHandlers.forEach((handler) => handler(event));
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
  off(eventType, handler) {
    if (isFunction(handler)) {
      const handlers = this.#events.get(eventType);
      handlers?.delete(handler);
      if (handlers?.size === 0) {
        this.#events.delete(eventType);
      }
    } else {
      this.#events.delete(eventType);
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
      for (const eventType of this.#events.keys()) {
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
    this.#events.clear();
    return this;
  }
}
