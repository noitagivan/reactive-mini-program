import {
  defineComponent,
  onMounted,
  onPageScroll,
  watch,
} from "../../reactive/index";

defineComponent(({ $this, $emit, inject, onPageDataProvide }) => {
  // const motto = inject("motto", "replace2");
  const propA = inject("propA", "propAAAA");
  const none = inject("none", "nulllll");

  watch(
    [propA, none],
    (p, n) => {
      console.log("watch providedData child", p, n);
    }
    // { immediate: true }
  );
  // watch(
  //   motto,
  //   (m) => {
  //     console.log("watch providedData child", m);
  //   },
  //   { immediate: true }
  // );

  onMounted(() => {
    console.log("ChildMounted", propA());
    // $this.triggerEvent("mounted", { me: $this });
    $emit("mounted", { me: $this });
  });
  onPageDataProvide((key) => {
    console.log("onPageDataProvide", key, propA());
  });
  onPageScroll((e) => {
    console.log("component onPageScroll", e);
  });
});
