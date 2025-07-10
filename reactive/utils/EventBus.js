import { isFunction, isString } from "./index";

export default class EventBus {
  _events = new Map();
  _withTimestamp = false;
  _shouldMatchWildcard = true;

  constructor(withTimestamp = false, shouldMatchWildcard = true) {
    this._withTimestamp = !!withTimestamp;
    this._shouldMatchWildcard = shouldMatchWildcard !== false;
  }

  /**
   * 订阅事件
   * @param { string | symbol } eventType 事件名（字符串或 Symbol）
   * @param { (payload) => void } handler 事件处理函数
   * @returns 取消订阅的函数
   */
  on(eventType, handler) {
    if (isFunction(handler)) {
      if (!this._events.has(eventType)) {
        this._events.set(eventType, new Set());
      }
      const handlers = this._events.get(eventType);
      handlers.add(handler);

      // 返回取消订阅的函数
      return () => {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this._events.delete(eventType);
        }
      };
    }
    return () => {};
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
    if (this._withTimestamp) event.timestamp = Date.now();

    const exactHandlers = this._events.get(eventType);
    if (exactHandlers?.size) {
      exactHandlers.forEach((handler) => handler(event));
    }
    if (isString(eventType) && eventType.includes("/")) {
      const parts = eventType.split(this.separator);
      parts.pop();
      while (parts.length) {
        const wildcardEventName = [...parts, "*"].join("/");
        const wildcardHandlers = this._events.get(wildcardEventName);
        if (wildcardHandlers?.size) {
          wildcardHandlers.forEach((handler) => handler(event));
        }
        parts.pop();
      }
    }
  }

  /**
   * 取消订阅特定事件的所有处理函数
   * @param { string | symbol } eventType 事件名
   */
  off(eventType) {
    this._events.delete(eventType);
  }

  /**
   * 取消某个命名空间下的所有事件（自动补充分隔符）
   * @example
   * - `offNamespace('user')` → 取消 'user/' 开头的所有事件
   * - `offNamespace('user/')` → 同上
   */
  offNamespace(namespace) {
    // 自动补充分隔符（如 'user' → 'user/'）
    const normalize = namespace.endsWith("/") ? namespace : namespace + "/";
    for (const eventType of this._events.keys()) {
      if (isString(eventType) && eventType.startsWith(normalize)) {
        this.off(eventType);
      }
    }
  }

  /**
   * 清除所有事件监听
   */
  clear() {
    this._events.clear();
  }
}
