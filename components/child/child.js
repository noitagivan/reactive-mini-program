import {
  defineComponent,
  onMounted,
  onPageScroll,
  watch,
} from "../../lib/index";

defineComponent(({ $this, $emit, inject, onPageDataProvide }) => {
  const motto = inject("motto", "replace2");
  const propA = inject("propA", "propAAAA");
  const none = inject("none", "nulllll");

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
  onPageDataProvide((key) => {
    console.log("onPageDataProvide", key, propA());
  });
  onPageScroll((e) => {
    console.log("component onPageScroll", e);
  });
});
