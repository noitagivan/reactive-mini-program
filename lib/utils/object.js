export function get(obj, path) {
  if (!obj || typeof obj !== "object") return undefined;

  // 处理路径中的数组索引和点号
  const keys = path
    .replace(/\[(\w+)\]/g, ".$1") // 将[x]转换为.x
    .replace(/^\.|\.$/g, "") // 去除首尾多余的点
    .split(".");

  let result = obj;
  for (const key of keys) {
    if (result === null || result === undefined) return undefined;
    result = result[key];
  }
  return result;
}

export function hasOwnProp(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}
