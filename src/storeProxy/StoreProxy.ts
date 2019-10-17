import { DispatchItem, StoreDeclarer, StoreBase, AppStore } from "event-flux";
import DispatchItemProxy, { IStoreDispatcher } from "./DispatchItemProxy";
import { MultiWinStoreProxy } from "./MultiWinStoreProxy";

export class StoreProxy extends DispatchItemProxy {
  constructor(appStore: IStoreDispatcher, storeKey: string) {
    super();
    return new Proxy(this, {
      get(target: StoreProxy, property: string, receiver) {
        if (target[property] != null) {
          return target[property];
        }
        return (...args: any[]) => appStore.handleDispatch({ store: storeKey, method: property, args });
      },
    });
  }
}

type StoreProxyConstruct = new (appStore: IStoreDispatcher, storeKey: string) => StoreProxy;

export class StoreProxyDeclarer<T> extends StoreDeclarer<T> {
  create(appStore: AppStore & IStoreDispatcher): StoreBase<T> {
    if (this.options!.storeKey === "multiWinStore") {
      return (new MultiWinStoreProxy(appStore, this.options!.storeKey!) as any) as StoreBase<T>;
    }
    return (new ((this.Store as any) as StoreProxyConstruct)(appStore, this.options!.storeKey!) as any) as StoreBase<T>;
  }
}
