wx.onBeforePageLoad((e) => {
  console.log("onBeforePageLoad", e);
});
wx.onAfterPageLoad((e) => {
  console.log("onAfterPageLoad", e);
});
wx.onBeforePageUnload((e) => {
  console.log("onBeforePageUnload", e);
});
wx.onAfterPageUnload((e) => {
  console.log("onAfterPageUnload", e);
});
