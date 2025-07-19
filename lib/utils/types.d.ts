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

type ParamLessFunction<T = unknown> = () => T;

type ProxyWrapper<T> = T;
