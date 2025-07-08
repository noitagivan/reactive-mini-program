import { defineComponent, onMounted } from "../../reactive/index";

defineComponent(({}, { $this, emit }) => {
  onMounted(() => {
    console.log("Child mounted");
    // $this.triggerEvent("mounted", { me: $this });
    emit("mounted", { me: $this });
  });
});
