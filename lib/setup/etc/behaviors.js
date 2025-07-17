import createInstanceLifetimeScope from "../InstanceLifetimeScope";

export const PageBehavior = (setup, observers, CONTEXT) =>
  Behavior({
    lifetimes: {
      created() {
        const pageId = this.getPageId();
        const scope = createInstanceLifetimeScope(this, {
          isPage: true,
        });
        scope
          .run((ctx) => CONTEXT.runSetup(setup, ctx), {
            setScope: (scp) => CONTEXT.setPageScope(pageId, scp),
            resetScope: () => CONTEXT.resetInstanceLifetimeScope(),
          })
          .mountPageLifetimeHandles(scope)
          .mountPageEventHandle(scope)
          .inactive();
      },
      attached() {
        CONTEXT.getPageScope(this.getPageId()).attachTo(null);
      },
    },
    observers,
  });

export const ComponentBehavior = (setup, options, CONTEXT) =>
  Behavior({
    lifetimes: {
      created() {
        const scope = createInstanceLifetimeScope(this, {
          isComponent: true,
        });
        scope
          .run((ctx) => CONTEXT.runSetup(setup, ctx), {
            setScope: (scope) => CONTEXT.setComponentScope(this, scope),
            resetScope: () => CONTEXT.resetInstanceLifetimeScope(),
          })
          .registerComponentLifetimeListener(scope, options)
          .inactive();
      },
      attached() {
        const scope = CONTEXT.getComponentScope(this);
        scope?.attachTo(CONTEXT.getParentComponentScopeOf(scope));
      },
    },
  });
