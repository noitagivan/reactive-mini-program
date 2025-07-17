import { definePage, onMounted, useSignal } from "../../../lib/index";
definePage(() => {
  const [name, setGreeting] = useSignal("");

  onMounted(() => {
    setGreeting("world");
  });
  return { name };
});
