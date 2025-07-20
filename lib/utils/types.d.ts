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

type CommonFunction<T = unknown[], R = unknown> = (...args: T) => R;

type VoidFunction<T = unknown[]> = CommonFunction<T, void>;

type ParamlessFunction<R = unknown> = () => R;

type EventHandle<T = unknown> = CommonFunction<[T], void>;

type ParamLessCallback = ParamlessFunction<void>;

type ProxyWrapper<T> = T;
