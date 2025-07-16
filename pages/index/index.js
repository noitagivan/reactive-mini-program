// index.js
import {
  useSignal,
  watchEffect,
  computed,
  definePage,
  useSchedule,
  onReady,
} from "../../lib/index";
import { useCounter, useWatches } from "./hooks";

const defaultAvatarUrl =
  "https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0";

const [globalCount, updareGlobalCount] = useSignal(0);

definePage(({ provide, $this }) => {
  useWatches();
  const count = useCounter();
  const motto = computed(() => `Hello World ${count()}`);

  provide("page", $this?.is);
  provide("motto", motto);

  watchEffect(() => {
    // console.log("globalCount", globalCount());
  });

  useSchedule(
    () => {
      updareGlobalCount(globalCount() + 1);
    },
    {
      interval: 2000,
      times: 8,
    }
  );

  onReady(function () {
    console.log("onReady", this);
  });

  return {
    motto,
    globalCount,
    userInfo: {
      avatarUrl: defaultAvatarUrl,
      nickName: "",
    },
    hasUserInfo: false,
    canIUseGetUserProfile: wx.canIUse("getUserProfile"),
    canIUseNicknameComp: wx.canIUse("input.type.nickname"),
    onPageScroll(e) {
      console.log("page onPageScroll", e);
    },
    bindViewTap() {
      wx.navigateTo({
        url: "../logs/logs",
      });
    },
    onChooseAvatar(e) {
      const { avatarUrl } = e.detail;
      const { nickName } = this.data.userInfo;
      this.setData({
        "userInfo.avatarUrl": avatarUrl,
        hasUserInfo: nickName && avatarUrl && avatarUrl !== defaultAvatarUrl,
      });
    },
    onInputChange(e) {
      const nickName = e.detail.value;
      const { avatarUrl } = this.data.userInfo;
      this.setData({
        "userInfo.nickName": nickName,
        hasUserInfo: nickName && avatarUrl && avatarUrl !== defaultAvatarUrl,
      });
    },
    getUserProfile(e) {
      // 推荐使用wx.getUserProfile获取用户信息，开发者每次通过该接口获取用户个人信息均需用户确认，开发者妥善保管用户快速填写的头像昵称，避免重复弹窗
      wx.getUserProfile({
        desc: "展示用户信息", // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
        success: (res) => {
          console.log(res);
          this.setData({
            userInfo: res.userInfo,
            hasUserInfo: true,
          });
        },
      });
    },
    onShareAppMessage() {
      CONTEXT.getPageScope(pageId)?.stop();
      console.log("page.onShareAppMessage");
      return {
        title: "转发标题A",
        imageUrl: "", // 图片 URL
      };
    },
  };
});
