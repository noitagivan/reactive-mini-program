import {
  defineComponent,
  onMounted,
  onShow,
  ref,
  useSchedule,
  useSignal,
  watch,
  watchEffect,
} from "../../lib/index";

defineComponent({
  setup({ $this, $props, provide, inject, defineProps, observe }) {
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
    const page = inject("page");
    const motto = inject("motto", "replace1");
    const [aaaa, setAaaa] = useSignal({
      bbbb: {
        cccc: "cccc",
      },
    });
    const [buttonName, setButtonName] = useSignal("Button");
    const buttonName2 = ref("Button2");

    provide("propA", () => props.propA);
    console.log("buttonName", buttonName);

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
    //   console.log("watchEffect->$props", $props());
    // });

    // watchEffect(() => {
    //   console.log("watchEffect->propA", props.propA, buttonName2.value);
    // });

    // watch(
    //   props,
    //   (v) => {
    //     console.log("watch(props)", v);
    //   },
    //   { immediate: true }
    // );

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
      buttonName2.value = "Clickable2";
    }, 3000);

    onShow(() => {
      console.log("onShow");
    });

    onMounted(() => console.log("ParentMount"));

    const onChildMount = (e) => {
      console.log("onChildMount", e.detail);
      const child = $this.selectComponent("#test");
      console.log("ChildExportOrInstance", child);
    };

    return {
      aaaa,
      buttonName: buttonName2,
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
