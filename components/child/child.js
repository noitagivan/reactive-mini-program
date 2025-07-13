import {
  defineComponent,
  onMounted,
  onPageScroll,
  watch,
} from "../../lib/index";

defineComponent(({ $this, $emit, inject, onPageProvidedDataReady, expose }) => {
  const motto = inject("motto", "replace2");
  const propA = inject("propA", "propAAAA");
  const none = inject("none", "nulllll");

  expose({
    aaaa: "aaaa",
    // bbbb: {},
    // cccc: [],
    // dddd: motto,
    eeee: 5,
    // ffff: () => {
    //   console.log("invoked expose method");
    // },
    gggg: null,
  });

  watch(
    [propA, none],
    ([p, n], [op, on]) => {
      console.log("watch providedData child: propA, none", [p, n], [op, on]);
    }
    // { immediate: true }
  );
  watch(
    motto,
    (m, om) => {
      console.log("watch providedData child: motto", m, om);
    },
    { immediate: true }
  );

  onMounted(() => {
    console.log("ChildMounted", propA());
    $emit("mounted", { me: $this });
  });
  onPageProvidedDataReady((key) => {
    console.log("onPageProvidedDataReady", key, propA());
  });
  onPageScroll((e) => {
    console.log("component onPageScroll", e);
  });
});
