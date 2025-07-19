interface CommonOptionsOption {
  multipleSlots: boolean;
  addGlobalClass: boolean;
  pureDataPattern: string;
}
interface PageOptionsOption extends CommonOptionsOption {
  styleIsolation: "page-isolated" | "page-apply-shared" | "page-shared";
}

interface ComponentOptionsOption extends CommonOptionsOption {
  styleIsolation: "isolated" | "apply-shared" | "shared";
  virtualHost: boolean;
}

interface SettingUpContext {
  isSettingUpOptions: boolean;
  isSettingUpInstance: boolean;
  isPage: boolean;
  isComponent: boolean;
  mixInBehaviors: (behaviors: string[], ...more: (string | string[])[]) => void;
  mix: (behaviors: string[], ...more: (string | string[])[]) => void;
  provide: <T>(key: symbol | string, data: T) => void;
}

interface PageSettingUpContext extends SettingUpContext {
  $this: PageInstance;
  isPage: true;
  defineOptions: (options: Partial<PageOptionsOption>) => void;
  onPullDownRefresh: (handle: () => void) => void;
  onReachBottom: (handle: () => void) => void;
  onPageScroll: (handle: (event: { scrollTop: number }) => void) => void;
  onTabItemTap: (
    handle: (event: {
      index: `${number}`;
      pagePath: string;
      text: string;
    }) => void
  ) => void;
}
interface PageSetupFunc {
  (context: PageSettingUpContext): void;
}
interface PageSetupOptions {
  setup: PageSetupFunc;
}

type RelationType = "parent" | "child" | "ancestor" | "descendant";
type RelationEventHandler = {
  linked?(target: ComponentInstance): void;
  unlinked?(target: ComponentInstance): void;
  linkChanged?(target: ComponentInstance): void;
};
type RelationDescription =
  | {
      type: RelationType;
      target: string;
    }
  | ({
      type: RelationType;
    } & RelationEventHandler);

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

type ObserveKey = string;
type ObserveSource =
  | ObserveKey
  | SignalImpl<any>
  | Getter<any>
  | InternalSignalCarrier<any>;

interface ComponentSettingUpContext extends SettingUpContext {
  $this: ComponentInstance;
  $emit: ComponentInstance["triggerEvent"];
  isComponent: true;
  defineOptions(options: Partial<ComponentOptionsOption>): void;
  externalClasses(classes: string[], ...more: (string | string[])[]): void;
  defineRelation(id: string, description: RelationDescription): void;
  defineProps<T extends PropDefinations = PropDefinations>(
    definations: T
  ): {
    readonly [K in keyof T]: InferPropType<T[K]>;
  };
  inject<T>(key: symbol | string, defaultValue?: T): T;
  expose(exports: Record<string, any>): void;
  defineExpose(exports: Record<string, any>): void;
  observe(
    source: ObserveSource | ObserveSource[],
    callback: (...values: unknown[]) => void
  ): () => boolean;
}
interface ComponentSetupFunc<
  T extends Record<string, any> = Record<string, any>
> {
  (context: ComponentSettingUpContext): T;
}
interface ComponentSetupOptions<
  T extends Record<string, any> = Record<string, any>
> {
  setup: ComponentSetupFunc<T>;
}
