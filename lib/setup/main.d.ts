export function defineApp(): void;

export function definePage(setup: PageSetupFunc): void;
export function definePage(options: PageSetupOptions): void;
export function definePage(
  setup: PageSetupFunc,
  options: Omit<PageSetupOptions, "setup">
): void;

export function defineComponent<
  T extends Record<string, any> = Record<string, any>
>(setup: ComponentSetupFunc<T>): void;
export function defineComponent<
  T extends Record<string, any> = Record<string, any>
>(options: ComponentSetupOptions<T>): void;
export function defineComponent<
  T extends Record<string, any> = Record<string, any>
>(
  setup: ComponentSetupFunc<T>,
  options: Omit<ComponentSetupOptions<T>, "setup">
): void;

export function useActiveSetupContext(): ExposedActiveSetupContext | null;
