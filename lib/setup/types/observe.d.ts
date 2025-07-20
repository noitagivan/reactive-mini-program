type ObserveKey = string;
type ObserveItem<T = any> = ObserveKey | WatchItem<T>;
type ObserveItems = [...ObserveItem<any>[]];
type ObserveSource = ObserveItems | ObserveItem<any>;
type ObserveValue<T extends ObserveSource> = T extends PrimitiveType
  ? T extends ObserveKey
    ? unknown
    : T
  : T extends Getter<infer G>
  ? G
  : T extends SignalPayloadRefImpl<infer R>
  ? R
  : T extends SignalCarrierImpl<infer C>
  ? C
  : T extends MutableSignalCarrierImpl<infer MC>
  ? MC
  : T;
type ObserveValues<T extends ObserveSource> = T extends PrimitiveType
  ? T extends ObserveKey
    ? unknown
    : T
  : T extends ObserveItems
  ? {
      [K in keyof T]: ObserveValue<T[K]>;
    }
  : ObserveValue<T>;
