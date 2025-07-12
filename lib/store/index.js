// const effectScope = createEffectScope();
// effectScope.run(() => {
//   const [count, setCount] = useSignal(1);
//   const greeting = computed(() => `Hello World (${count()})`);

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
