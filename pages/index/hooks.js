// index.js
import {
  useSignal,
  watch,
  watchEffect,
  computed,
  onUnmounted,
  onMounted,
} from "../../reactive/index";

export const useCounter = (init = 1, step = 1) => {
  let timer;
  const [count, setCount] = useSignal(init);

  onMounted(() => {
    console.log("onMounted");
    timer = setInterval(() => {
      setCount(count() + step);
    }, 4000);
  });

  onUnmounted(() => {
    console.log("onUnmounted");
    if (timer) clearInterval(timer);
  });

  return count;
};

export const useWatches = () => {
  const [count, setCount] = useSignal(1);
  const double = computed(() => count() * 2, {
    // onTrack: (e) => {
    //   console.log("onTrack", e);
    // },
    // onTrigger: (e) => {
    //   console.log("onTrigger", e);
    // },
  });

  watch(
    [double],
    (val) => {
      console.log("watch double", val);
      // setCount(val);
    },
    { immediate: true }
  );

  // const { pause, resume } = watch(
  //   [count, double],
  //   (c, d) => {
  //     console.log("watch count, double", c, d);
  //   },
  //   { immediate: true }
  // );

  // const { stop } = watchEffect(() => {
  //   console.log("watchEffect", count(), double());
  // });

  // let timer;
  // onMounted(() => {
  //   timer = setTimeout(() => {
  //     pause();
  //     setCount(2);
  //     timer = setTimeout(() => {
  //       resume();
  //       setCount(3);
  //       timer = setTimeout(() => {
  //         stop();
  //         setCount(4);
  //         timer = setTimeout(() => setCount(5), 1000);
  //       }, 1000);
  //     }, 1000);
  //   }, 1000);
  // });

  // onUnmounted(() => {
  //   if (timer) clearTimeout(timer);
  // });
};
