interface AppDataAndMethod {
  userInfo: null;
  onLaunch: () => void;
}

type UseSetupApp<T = Record<string, any>> = T;
