type PrimitiveType =
  | string // 字符串
  | number // 数字
  | boolean // 布尔值
  | null // null
  | undefined // undefined
  | symbol // Symbol
  | bigint; // BigInt

// 等价于：string | number | boolean | symbol | bigint
type NonNullablePrimitive = Exclude<PrimitiveType, null | undefined>;

type CommonFunction<T = unknown, A = unknown[]> = (...args: A) => T;

type RMPVoidFunction<A = unknown[]> = CommonFunction<void, A>;

type ParamlessFunction<T = unknown> = () => T;

type EventHandle<T = unknown> = CommonFunction<void, [T]>;

type ParamLessCallback = ParamlessFunction<void>;

type ProxyWrapper<T> = T;
