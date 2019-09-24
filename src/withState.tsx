import * as React from 'react';
import { StoreContext } from './Provider';
import { pick } from './utils/objUtils';

export type SelectorFunc = (state: any, props: any) => any;

const notUsed = () => null;
export function unifySelector(selector: string[] | SelectorFunc) {
  if (!selector) return notUsed;
  if (typeof selector !== 'function') {
    if (!Array.isArray(selector)) selector = [selector];
    return (state: any) => pick(state, selector as string[]); 
  }
  return selector;
}

export default function withState(stateSelector: string[] | SelectorFunc, storeSelector: string[] | SelectorFunc) {
  const storeSelectorFn = unifySelector(storeSelector) as SelectorFunc;
  const stateSelectorFn = unifySelector(stateSelector) as SelectorFunc;
  return function(Component: React.ComponentClass) {

    return class Injector extends React.PureComponent<any> {
      render() {
        let props = this.props;
        return (
          <StoreContext.Consumer>
            {value => <Component 
              {...props}
              {...storeSelectorFn(value.stores, props)} 
              {...stateSelectorFn(value.state, props)}
            />}
          </StoreContext.Consumer>
        );
      }
    }
  }
}