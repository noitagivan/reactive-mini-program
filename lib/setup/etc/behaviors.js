import { shortUUID } from "../../utils/index";
import createInstanceLifetimeScope from "../InstanceLifetimeScope";

export const uuid = `__$${shortUUID()}$__`;

const lifetimes = {
  created() {
    const { runSetup, setScope, resetScope } = this.data[uuid];
    const pageId = this.getPageId();
    const scope = createInstanceLifetimeScope(this, {
      isPage: true,
    });
    scope
      .run((ctx) => runSetup(ctx), {
        setScope: () => setScope(pageId, scope),
        resetScope,
      })
      .mountPageLifetimeHandles(scope)
      .mountPageEventHandle(scope)
      .inactive();
  },
  attached() {
    this.data[uuid].getScope(this.getPageId()).attachTo(null);
  },
};
const cPageSB = Behavior({ lifetimes });
export const PageSetupBehavior = (observers) =>
  observers?.length ? Behavior({ lifetimes, observers }) : cPageSB;

const cComponentSB = Behavior({
  lifetimes: {
    created() {
      const { runSetup, setScope, resetScope, options } = this.data[uuid];
      const scope = createInstanceLifetimeScope(this, {
        isComponent: true,
      });
      scope
        .run((ctx) => runSetup(ctx), {
          setScope: (scope) => setScope(this, scope),
          resetScope,
        })
        .registerComponentLifetimeListener(scope, options)
        .inactive();
    },
    attached() {
      const { getScope, getParentScope } = this.data[uuid];
      const scope = getScope(this);
      scope?.attachTo(getParentScope(scope));
    },
  },
});
export const ComponentSetupBehavior = () => cComponentSB;
