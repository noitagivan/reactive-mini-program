import { defineComponent, onMounted, watch } from "../../reactive/index";

defineComponent(({ inject }, { $this, emit }) => {
  const motto = inject("motto", "replace2");
  const propA = inject("propA", "propAAAA");
  const none = inject("none", "nulllll");

  watch(
    [motto, propA, none],
    (m, p, n) => {
      console.log("watch providedData child", m, p, n);
    },
    { immediate: true }
  );

  onMounted(() => {
    console.log("Child mounted");
    // $this.triggerEvent("mounted", { me: $this });
    emit("mounted", { me: $this });
  });
});
