import { defineComponent, onMounted } from "../../reactive/index";

defineComponent(() => {
  onMounted(() => console.log("Child mounted"));
});
