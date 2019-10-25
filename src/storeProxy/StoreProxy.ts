import { DispatchItem, StoreDeclarer, StoreBase, AppStore } from "event-flux";
import DispatchItemProxy, { IStoreDispatcher } from "./DispatchItemProxy";
import { MultiWinStoreProxy } from "./MultiWinStoreProxy";
import RendererAppStore from "../RendererAppStore";

enum MethodType {
  Simple,
  EV,
  Invoker,
}

export function proxyStore<T extends DispatchItemProxy>(appStore: IStoreDispatcher, store: T, storeKey: string) {
  return new Proxy(store, {
    get(target: T, property: string, receiver) {
      if (target[property] != null) {
        return target[property];
      }
      let methodType: MethodType = MethodType.Simple;
      if (target.evs.has(property)) {
        methodType = MethodType.EV;
      } else if (target.invokers.has(property)) {
        methodType = MethodType.Invoker;
      }
      return (...args: any[]) => {
        switch (methodType) {
          case MethodType.Simple:
            return appStore.handleDispatchNoReturn({ store: storeKey, method: property, args });
          case MethodType.EV:
            return appStore.handleDispatchDisposable({ store: storeKey, method: property }, args[0]);
          case MethodType.Invoker:
            return appStore.handleDispatch({ store: storeKey, method: property, args });
        }
      };
    },
  });
}

export class StoreProxy extends DispatchItemProxy {
  evs: Set<string>;
  invokers: Set<string> = new Set<string>();

  constructor(appStore: IStoreDispatcher, storeKey: string, evs: string[], invokers: string[]) {
    super();

    this.evs = new Set<string>(evs);
    this.invokers = new Set<string>(invokers);

    return proxyStore(appStore, this, storeKey);
  }
}

type StoreProxyConstruct = new (
  appStore: IStoreDispatcher,
  storeKey: string,
  evs: string[],
  invokers: string[]
) => StoreProxy;

export class StoreProxyDeclarer<T> extends StoreDeclarer<T> {
  create(appStore: AppStore & IStoreDispatcher): StoreBase<T> {
    let { storeKey, _evs, _invokers } = this.options!;
    if (storeKey === "multiWinStore") {
      return (new MultiWinStoreProxy(appStore, storeKey!, _evs, _invokers) as any) as StoreBase<T>;
    }
    return (new StoreProxy(appStore, storeKey!, _evs, _invokers) as any) as StoreBase<T>;
  }
}
