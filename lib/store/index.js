// const effectScope = createEffectScope();
// effectScope.run(() => {
//   const [count, setCount] = useSignal(1);
//   const greeting = computed(() => `Hello World (${count()})`);

import { isComputedSignal, isWatchable } from "../state/index";
import { isFunction } from "../utils/index";

//   const { pause, resume } = watch(
//     [count, greeting],
//     ([c, g]) => {
//       console.log("watch", c, count(), g, greeting());
//     },
//     { immediate: true }
//   );

//   const { stop } = watchEffect(() => {
//     console.log("watchEffect", count(), greeting());
//   });

// });
// console.log("[ EffectScope ]", effectScope);
export default function defineStore(id, setupLike) {
  const effectScope = createEffectScope();
  const state = {};
  const getters = {};
  const actions = {};
  const setupResult = effectScope.run(() => {
    return setupLike();
  });
  Object.entries(setupResult).forEach(([name, item]) => {
    if (isWatchable(item)) {
      if (isComputedSignal(item)) {
        getters[name] = item;
      } else {
        state[name] = item;
      }
    } else if (isFunction(item)) {
      actions[name] = item;
    } else {
      state[name] = item;
    }
  });

  return {};
}
