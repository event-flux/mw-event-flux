import {
  DispatchItem,
  AppStore,
  StoreListDeclarer,
  StoreList,
  StoreBaseConstructor,
  StoreListDeclarerOptions,
  DispatchParent,
} from "event-flux";
import DispatchItemProxy, { IStoreDispatcher } from "./DispatchItemProxy";

class StoreListItemProxy extends DispatchItemProxy {
  constructor(appStore: IStoreDispatcher, storeKey: string, indexKey: number) {
    super();
    return new Proxy(this, {
      get(target: StoreListItemProxy, property: string, receiver) {
        if (target[property] != null) {
          return target[property];
        }
        return (...args: any[]) =>
          appStore.handleDispatch({ store: storeKey, index: indexKey, method: property, args });
      },
    });
  }
}

export class StoreListProxy extends DispatchItemProxy {
  _appStore: IStoreDispatcher;
  _storeKey: string;

  length: number = 0;
  storeArray: StoreListItemProxy[] = [];

  constructor(appStore: IStoreDispatcher, storeKey: string) {
    super();
    this._appStore = appStore;
    this._storeKey = storeKey;
  }

  _inject(
    appStore: DispatchParent,
    StoreBuilder: StoreBaseConstructor<any>,
    stateKey?: string,
    depStores?: { [storeKey: string]: DispatchItem },
    initState?: any,
    options?: StoreListDeclarerOptions
  ) {
    this._stateKey = stateKey;
    let size = options!.size || 0;
    if (size > 0) {
      this.setSize(size);
    }
  }

  setSize(count: number) {
    if (this.length === count) {
      return;
    }
    this._appStore.handleDispatchNoReturn({ store: this._storeKey, method: "setSize", args: [count] });
    if (this.length < count) {
      for (let i = this.length; i < count; ++i) {
        this.storeArray.push(new StoreListItemProxy(this._appStore, this._storeKey, i));
      }
    } else {
      this.storeArray.splice(count, this.length - count);
    }
    this.length = count;
  }

  get(index: number) {
    return this.storeArray[index];
  }
}

type StoreListProxyConstruct = new (appStore: IStoreDispatcher, storeKey: string) => StoreListProxy;

export class StoreListProxyDeclarer<T> extends StoreListDeclarer<T> {
  create(appStore: AppStore & IStoreDispatcher): StoreList<T> {
    return (new StoreListProxy(appStore, this.options!.storeKey!) as any) as StoreList<T>;
  }
}
