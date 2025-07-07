export const partialCLifetimes = ["ready", "moved", "error"];
export const cLifetimes = [
  "created",
  "attached",
  "mounted",
  "detached",
  "unmounted",
  ...partialCLifetimes,
];
export const pLifetimes = ["show", "routeDone", "resize", "hide"];
