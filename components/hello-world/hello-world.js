import { computed, defineComponent } from "../../lib/index";

defineComponent(({ defineProps }) => {
  const props = defineProps({
    name: String,
  });

  const greeting = computed(() => `Hello, ${props.name}!`);
  return { greeting };
});
