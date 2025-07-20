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
  behaviors: (ids: string | string[], ...more: (string | string[])[]) => void;
  provide: <T>(key: symbol | string, data: T) => void;
}

interface PageSettingUpContext extends SettingUpContext {
  $this: PageInstance;
  isPage: true;
  defineOptions: (options: Partial<PageOptionsOption>) => void;
  onPullDownRefresh: (handle: ParamLessCallback) => void;
  onReachBottom: (handle: ParamLessCallback) => void;
  onPageScroll: (handle: EventHandle<PageScrollEvent>) => void;
  onTabItemTap: (
    handle: (event: {
      index: `${number}`;
      pagePath: string;
      text: string;
    }) => void
  ) => void;
}

interface ComponentSettingUpContext extends SettingUpContext {
  $this: ComponentInstance;
  $emit: ComponentInstance["triggerEvent"];
  isComponent: true;
  defineOptions(options: Partial<ComponentOptionsOption>): void;
  extClasses(attrs: string | string[], ...more: (string | string[])[]): void;
  defineRelation(id: string, description: RelationDescription): void;
  defineProps<T extends PropDefinations = PropDefinations>(
    definations: T
  ): {
    readonly [K in keyof T]: InferPropType<T[K]>;
  };
  inject<T>(key: symbol | string, defaultValue?: T): ComputedSignalImpl<T>;
  defineExpose(exports: Record<string, any>): void;
  observe<T extends ObserveSource>(
    source: T,
    callback: (...values: ObserveValues<T>) => void
  ): () => boolean;
}
interface PageSetupFunc {
  (context: PageSettingUpContext): void;
}
interface PageSetupOptions {
  setup: PageSetupFunc;
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
