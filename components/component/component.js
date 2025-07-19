import {
  defineComponent,
  onMounted,
  onShow,
  ref,
  // ref,
  useSchedule,
  useSignal,
  watch,
  watchEffect,
} from "../../lib/index";

defineComponent({
  setup({ $this, provide, inject, defineProps, observe }) {
    const props = defineProps({
      propA: {
        type: String,
        value: "00000",
        observer(a, b) {
          console.log(2222, a);
        },
      },
      propB: Boolean,
      propC: {
        type: Number,
      },
    });
    const page = inject("page");
    const motto = inject("motto", "replace1");
    const [aaaa, setAaaa] = useSignal({
      bbbb: {
        cccc: "cccc",
      },
    });
    const [buttonName, setButtonName] = useSignal("Button");
    const buttonName2 = ref("Button");

    provide("propA", () => props.propA);
    provide("propB", () => props.propB);
    provide("propC", () => props.propC);

    // watch(
    //   aaaa,
    //   (v) => {
    //     console.log("observers watch aaaa", v);
    //   },
    //   { immediate: true }
    // );

    // watchEffect(() => {
    //   console.log("observers watchEffect aaaa().bbbb", aaaa().bbbb);
    // });

    // watch(
    //   [page, motto],
    //   ([p, m]) => {
    //     console.log("watch providedData com", p, m);
    //   },
    //   { immediate: true }
    // );

    // watchEffect(() => {
    //   console.log("watchEffect->propA", props.propA, buttonName2.value);
    // });
    watchEffect(() => {
      console.log("watchEffect->buttonName2", buttonName2.value);
    });

    watch(
      ["aaaa", props, buttonName, buttonName2, () => props.propA],
      (v) => {
        console.log("watch(props)", v);
      },
      { immediate: true }
    );

    watch(
      [props, () => props.propB],
      (v) => {
        console.log("watch(props)", v);
      },
      { immediate: true }
    );
    watch(
      () => props.propC,
      (v) => {
        console.log("watch(props)", v);
      },
      { immediate: true }
    );
    watch(
      props,
      (v) => {
        console.log("watch(props)", v);
      },
      { immediate: true }
    );
    watch(
      buttonName2,
      (v) => {
        console.log("watch(props)", v);
      },
      { immediate: true }
    );
    watch(
      buttonName,
      (v) => {
        console.log("watch(props)", v);
      },
      { immediate: true }
    );
    watch(
      "buttonName",
      (v) => {
        console.log("watch(props)", v);
      },
      { immediate: true }
    );
    watch(
      true,
      (v) => {
        console.log("watch(props)", v);
      },
      { immediate: true }
    );

    // observe([page, "propB", motto], (p, b, m) => {
    //   console.log("observe(page, propB, motto)", p, b, m);
    // });

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
      buttonName2.value = "Clickable";
    }, 3000);

    onShow(() => {
      console.log("onShow");
    });

    onMounted(() => console.log("ParentMount"));

    const onChildMount = (e) => {
      console.log("onChildMount", e.detail);
      const child = $this.selectComponent("#test");
      console.log("ChildExportOrInstance", child);
      child.ffff("ffff");
    };

    return {
      aaaa,
      buttonName,
      buttonName2,
      onClick2(e) {
        console.log("setup onClick2", e, this);
      },
      onChildMount,
    };
  },
  // data: {
  //   aaaa: {
  //     bbbb: {
  //       cccc: "cccc",
  //     },
  //   },
  // },
  methods: {
    onClick1(e) {
      console.log("observers methods onClick1", e, this);
      this.setData({
        "aaaa.bbbb.cccc": "dddd",
      });
      // this.setData({
      //   aaaa: {
      //     bbbb: {
      //       cccc: "dddd",
      //     },
      //   },
      // });
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
