type Data = Record<string, unknown>;

interface BaseInstance {
  setData(data: Data, callback?: () => void): void;
}

interface PageInstance extends BaseInstance {}

interface ComponentInstance extends BaseInstance {
  triggerEvent(name: string, detail?: object, options?: object): void;
}
