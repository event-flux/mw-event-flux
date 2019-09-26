import * as React from "react";
import { StoreContext } from "./Provider";
import { SelectorFunc, unifySelector } from "./withState";

export default function useState(
  stateSelector: string[] | SelectorFunc,
  storeSelector: string[] | SelectorFunc,
  props?: any
) {
  const storeSelectorFn = unifySelector(storeSelector) as SelectorFunc;
  const stateSelectorFn = unifySelector(stateSelector) as SelectorFunc;
  const value = React.useContext(StoreContext);

  return {
    ...storeSelectorFn(value.stores, props),
    ...stateSelectorFn(value.state, props),
  };
}
