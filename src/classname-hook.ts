import { JSX, options } from "preact";

declare module "preact" {
  namespace h {
    namespace JSX {
      interface HTMLAttributes {
        classes?: string[] | string;
      }
    }
  }
}

let oldHook = options.vnode;
options.vnode = (vnode) => {
  if (vnode.props.classes) {
    vnode.props.class = Array.isArray(vnode.props.classes)
      ? vnode.props.classes.filter(Boolean).join(" ")
      : vnode.props.classes;
  }
  return oldHook?.(vnode);
};
