import { defineApp } from "./lib/index";

defineApp(() => {
  const onLaunch = () => {
    // 展示本地存储能力
    const logs = wx.getStorageSync("logs") || [];
    logs.unshift(Date.now());
    wx.setStorageSync("logs", logs);

    // 登录
    wx.login({
      success: (res) => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      },
    });
  };
  return {
    userInfo: null,
    onLaunch,
  };
});
