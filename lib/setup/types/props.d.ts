type PrimitiveConstructor =
  | StringConstructor
  | NumberConstructor
  | BooleanConstructor
  | ArrayConstructor
  | ObjectConstructor;
type PropMethod<T, TConstructor = any> = [T] extends [
  ((...args: any) => any) | undefined
]
  ? {
      new (): TConstructor;
      (): T;
      readonly prototype: TConstructor;
    }
  : never;
type PropConstructor<T> =
  | PrimitiveConstructor
  | { (): T }
  | { new (...args: any[]): {} }
  | PropMethod<T>;

interface PropObserver<T> {
  (): void;
  (value: T): void;
  (value: T, oldValue: T): void;
}
type PropOptions<T = any, D = T> = {
  type: PropConstructor<T>;
  optionalTypes?: (PropConstructor<T> | null)[];
  value?: D;
  observer?: PropObserver<T>;
};

type Prop<T, D = T> = PropConstructor<T> | PropOptions<T, D>;
type PropDefinations<P = Data> = {
  [K in keyof P]: Prop<P[K]> | null;
};

// 类型定义
type InferPropType<T> = T extends { type: infer Type }
  ? Type extends { (...args: any[]): infer R }
    ? R
    : Type extends { new (...args: any[]): infer O }
    ? O
    : unknown
  : T extends { value: infer V }
  ? V
  : T extends { (...args: any[]): infer R }
  ? R
  : T extends { new (...args: any[]): infer O }
  ? O
  : never;
