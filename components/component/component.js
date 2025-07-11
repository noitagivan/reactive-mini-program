import {
  defineComponent,
  isWatchable,
  ref,
  useSchedule,
  useSignal,
  watch,
  watchEffect,
} from "../../reactive/index";

defineComponent({
  setup(
    { defineProps, observe, inject, provide },
    { isSettingUpInstance, $props }
  ) {
    const props = defineProps({
      propA: {
        type: String,
        value: "00000",
      },
      propB: Boolean,
      propC: {
        type: Number,
      },
    });
    const [buttonName, setButtonName] = useSignal("Button");
    const buttonName2 = ref("Button2");

    const page = inject("page");
    const motto = inject("motto", "replace1");
    provide("propA", () => props.propA);

    console.log(
      `[ Define Component ${isSettingUpInstance ? "Instance" : "Options"} ]`,
      isWatchable(props),
      "props:",
      props,
      "buttonName:",
      buttonName
    );

    watch(
      [page, motto],
      (p, m) => {
        console.log("watch providedData com", p, m);
      },
      { immediate: true }
    );

    watchEffect(() => {
      console.log("defineComponent->watchEffect->$props", $props());
    });

    watchEffect(() => {
      console.log(
        "defineComponent->watchEffect->propA",
        props.propA,
        buttonName2.value
      );
    });

    watch(
      props,
      (v) => {
        console.log("defineComponent->watch(props)", v);
      },
      { immediate: true }
    );

    observe(["propB"], (b) => {
      console.log("defineComponent->observe(propB)", b);
    });

    // observe("aaaa", (v) => {
    //   console.log("observers aaaa", v);
    // });

    // observe("aaaa.bbbb", (v) => {
    //   console.log("observers aaaa.bbbb", v);
    // });

    // observe("aaaa.bbbb.cccc", (v) => {
    //   console.log("observers aaaa.bbbb.cccc", v);
    // });

    useSchedule(() => {
      setButtonName("Clickable");
      buttonName2.value = "Clickable2";
    }, 3000);

    const onChildMount = (e) => console.log("onChildMount", e.detail);

    return {
      buttonName: buttonName2,
      onClick2(e) {
        console.log("setup onClick2", e, this);
      },
      onChildMount,
    };
  },
  data: {
    aaaa: {
      bbbb: {
        cccc: "cccc",
      },
    },
  },
  methods: {
    onClick1(e) {
      console.log("observers methods onClick1", e, this);
      this.setData({
        "aaaa.bbbb.cccc": "dddd",
      });
      this.setData({
        aaaa: {
          bbbb: {
            cccc: "dddd",
          },
        },
      });
    },
    onClick2(e) {
      console.log("methods onClick2", e, this);
    },
  },
  observers: {
    aaaa(v) {
      console.log("observers aaaa", v);
    },
    "aaaa.bbbb"(v) {
      console.log("observers aaaa.bbbb", v);
    },
    "aaaa.bbbb.cccc"(v) {
      console.log("observers aaaa.bbbb.cccc", v);
    },
  },
});
