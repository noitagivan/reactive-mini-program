import {
  defineComponent,
  isWatchable,
  useSchedule,
  useSignal,
  watch,
  watchEffect,
} from "../../reactive/index";

defineComponent({
  setup({ defineProps, plainProps }, context) {
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

    console.log(
      `[ Define Component ${
        context.isSettingUpInstanceInstance ? "Instance" : "Options"
      } ]`,
      isWatchable(props),
      props
    );

    watchEffect(() => {
      console.log("defineComponent->watchEffect->plainProps", plainProps());
    });

    watchEffect(() => {
      console.log("defineComponent->watchEffect->propA", props.propA);
    });

    watch(
      props,
      (v) => {
        console.log("defineComponent->watch(props)", v);
      },
      { immediate: true }
    );

    useSchedule(() => {
      setButtonName("Clickable");
    }, 3000);

    return {
      buttonName,
      onClick2(e) {
        console.log("setup onClick2", e, this);
      },
    };
  },
  methods: {
    onClick1(e) {
      console.log("methods onClick1", e, this);
    },
    onClick2(e) {
      console.log("methods onClick2", e, this);
    },
  },
});
