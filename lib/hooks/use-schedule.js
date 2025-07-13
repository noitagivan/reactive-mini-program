import { onMounted, onUnmounted } from "../setup/index";
import {
  formatPositiveInteger,
  isNonNullObject,
  isPositiveNumber,
} from "../utils/index";

/**
 *
 * @param { () => void } task
 * @param {*} config
 *
 * @returns { ()=> void } clear
 */
export default function useSchedule(task, config) {
  let immediate = false,
    interval = 1000,
    paused = false,
    timer = null,
    times = 1;
  if (isPositiveNumber(config)) {
    interval = formatPositiveInteger(config, 1000);
  } else if (isNonNullObject(config)) {
    interval = formatPositiveInteger(config.interval, 1000);
    times = formatPositiveInteger(config.times);
  }
  const { handle, start, end } =
    times === 1
      ? { handle: task, start: setTimeout, end: clearTimeout }
      : {
          handle: times ? () => (task(), --times) < 1 && clear() : task,
          start: setInterval,
          end: clearInterval,
        };
  const run = () => (
    (timer = start(handle, interval)), (paused = false), immediate && handle()
  );
  const clear = () => timer && (end(timer), ((timer = null), (paused = true)));

  onMounted(run);
  onUnmounted(clear);

  clear.restart = () => paused && run();
  return clear;
}
