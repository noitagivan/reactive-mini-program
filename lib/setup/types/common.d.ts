type Data = Record<string, unknown>;

interface BaseInstance {
  setData(data: Data, callback?: ParamLessCallback): void;
}

interface PageInstance extends BaseInstance {}

interface ComponentInstance extends BaseInstance {
  triggerEvent(name: string, detail?: object, options?: object): void;
}

interface ExposedLifetimeScope {
  isPage: boolean;
  isComponent: boolean;
  readonly instance: ComponentInstance | PageInstance;
  readonly pageInstance: PageInstance;
  getParentScope: () => ExposedLifetimeScope;
  getPageScope: () => ExposedLifetimeScope;
  on: (lifetime: string, handle: ParamLessCallback) => boolean;
}

type ExposedSettingUpContext = Pick<
  Partial<ComponentSettingUpContext>,
  | "behaviors"
  | "extClasses"
  | "inject"
  | "observe"
  | "provide"
  | "defineRelation"
>;

interface ExposedActiveSetupContext {
  isPage: boolean;
  isComponent: boolean;
  lifetimeScope: ExposedLifetimeScope | null;
  settingUpContext: ExposedSettingUpContext | null;
  on: (name: string, listener: EventHandle | ParamLessCallback) => boolean;
}

interface PageScrollEvent {
  scrollTop: number;
}

interface TabItemTapEvent {
  index: `${number}`;
  pagePath: string;
  text: string;
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
