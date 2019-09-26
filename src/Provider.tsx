import * as React from "react";

interface ContextValue {
  _appStore: any;
  stores: object;
  state: object;
}

interface ProviderProps {
  appStore: any;
}

export const StoreContext = React.createContext({ _appStore: null, stores: {}, state: {} });
const ContextProvider = StoreContext.Provider;

export default class Provider extends React.PureComponent<ProviderProps, ContextValue> {
  appStore: any;

  constructor(props: ProviderProps) {
    super(props);
    this.appStore = props.appStore;
    this.appStore.onDidChange(this.handleStateChange);
    this.state = {
      _appStore: this.appStore,
      stores: this.appStore.stores,
      state: this.appStore.state,
    };
  }

  handleStateChange = (state: any) => {
    this.setState({ state });
  };

  render() {
    return <ContextProvider value={this.state}>{React.Children.only(this.props.children)}</ContextProvider>;
  }
}
