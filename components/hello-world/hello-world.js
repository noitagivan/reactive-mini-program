import { computed, defineComponent, useSetupApp } from "../../lib/index";

defineComponent(({ defineProps, observe }) => {
  const props = defineProps({
    name: String,
  });

  /** @type {UseSetupApp<AppDataAndMethod>} */
  const { userInfo } = useSetupApp();

  const greeting = computed(() => `Hello, ${props.name}!`, {
    // onTrigger: (e) => console.log(e),
    // onTrack: (e) => console.log(e),
  });

  observe([() => props.name], (name) => console.log(name));
  return { greeting };
});
