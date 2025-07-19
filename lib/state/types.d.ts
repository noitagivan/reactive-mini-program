type UpdateSignalValueOptions = { forced?: boolean; shouldBeRetrack?: boolean };

interface Getter<T = any> {
  (): T;
}
interface SignalImpl<T = any> extends Getter<T> {
  readonly name: "Signal";
  readonly value: T | undefined;
  readonly length: 0;
  readonly __is_signal: true;
  readonly create<U>(value: U): SignalImpl<U>;
  readonly update<U>(
    signal: SignalImpl<U>,
    value: U | undefined,
    options: UpdateSignalValueOptions
  ): boolean;
}

interface SignalEmitter<T> {
  (value: T, options: UpdateSignalValueOptions): boolean;
}

interface ComputedSignalImpl<T> extends SignalImpl<T> {
  readonly __is_computed: true;
}

interface TrackEffectPayload<T> {
  shouldBeRetrack: boolean;
  value: T | undefined;
  oldValue: T | undefined;
}

interface TrackScopeEvent<
  T extends "track" | "trigger" | "result",
  P extends Record<string, any>
> {
  type: T;
  payload: P;
  target: null;
}
interface TrackScopeObserver<T> {
  onTrigger?(event: TrackScopeEvent<"trigger", TrackEffectPayload<T>>): void;
  onTrack?(
    event: TrackScopeEvent<
      "result",
      { signal: SignalImpl<T>; value: T | undefined }
    >
  ): void;
  onResult?(event: TrackScopeEvent<"track", T>): void;
}

interface WatchOptions<T = any>
  extends Pick<TrackScopeObserver<T>, "onTrack" | "onTrigger"> {
  immediate: boolean;
  once: boolean;
}

interface WatchHandler {
  readonly pause: () => void;
  readonly resume: () => void;
  readonly stop: () => void;
}
interface WatchHandle extends WatchHandler {
  (): void;
}

type MutableSignalCarrierImpl<T extends Record<string, any>> = ProxyWrapper<{
  [K in keyof T]: T[K];
}>;

type SignalCarrierImpl<T extends Record<string, any>> = ProxyWrapper<{
  readonly [K in keyof T]: T[K];
}>;

type NestedSignalCarrierImpl<T extends Record<string, any>> = ProxyWrapper<{
  [K in keyof T]: T[K] extends Record<string, any>
    ? ProxyWrapper<T[K]> // 如果是对象类型，使用嵌套代理
    : T[K];
}>;

type SignalPayloadRefImpl<T = any> = ProxyWrapper<{
  value: T extends Record<string, any>
    ? NestedSignalCarrierImpl<T> // 如果是对象类型，使用嵌套代理
    : T | undefined;
}>;

type InternalSignalCarrier<T extends Record<string, any>> =
  | SignalCarrierImpl<T>
  | MutableSignalCarrierImpl<T>
  | NestedSignalCarrierImpl<T>
  | SignalPayloadRefImpl<any>;

type WatchItem<T = any> =
  | Getter<T>
  | SignalCarrierImpl<T>
  | MutableSignalCarrierImpl<T>
  | SignalPayloadRefImpl<T>
  | T;
type WatchItems = [...WatchItem<any>[]];
type WatchSource = WatchItems | WatchItem<any>;
type WatchValue<T extends WatchSource> = T extends PrimitiveType
  ? T
  : T extends Getter<infer G>
  ? G
  : T extends SignalPayloadRefImpl<infer R>
  ? R
  : T extends SignalCarrierImpl<infer C>
  ? C
  : T extends MutableSignalCarrierImpl<infer MC>
  ? MC
  : T;
type WatchValues<T extends WatchSource> = T extends PrimitiveType
  ? T
  : T extends WatchItems
  ? {
      [K in keyof T]: WatchValue<T[K]>;
    }
  : WatchValue<T>;
