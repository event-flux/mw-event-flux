import { DispatchItem, AppStore, StoreMapDeclarer, StoreMap, OperateMode, OperateModeSwitch } from "event-flux";
import DispatchItemProxy, { IStoreDispatcher } from "./DispatchItemProxy";
import { DisposableLike, CompositeDisposable } from "event-kit";

class StoreMapItemProxy extends DispatchItemProxy {
  constructor(appStore: IStoreDispatcher, storeKey: string, indexKey: string) {
    super();
    return new Proxy(this, {
      get(target: StoreMapItemProxy, property: string, receiver) {
        if (target[property] != null) {
          return target[property];
        }
        return (...args: any[]) =>
          appStore.handleDispatch({ store: storeKey, index: indexKey, method: property, args });
      },
    });
  }
}

export class StoreMapProxy extends DispatchItemProxy {
  _appStore: IStoreDispatcher;
  _storeKey: string;

  length: number = 0;
  storeMap: Map<string, StoreMapItemProxy> = new Map();
  _keyRefs: { [key: string]: number } = {};
  _disposables = new CompositeDisposable();

  operateModeSwitch = new OperateModeSwitch();

  constructor(appStore: IStoreDispatcher, storeKey: string) {
    super();
    this._appStore = appStore;
    this._storeKey = storeKey;
  }

  _invokeRemoteMethod(method: string, ...args: any[]) {
    this._appStore.handleDispatchNoReturn({ store: this._storeKey, method, args });
  }

  requestStore(storeKey: string) {
    this.operateModeSwitch.enterRefCountMode();
    if (this._keyRefs[storeKey]) {
      this._keyRefs[storeKey] += 1;
    } else {
      this._keyRefs[storeKey] = 1;
      // this.add(storeKey);
      this._appStore.handleMainMapRequestStores!(this._storeKey, [storeKey]);
      if (!this.storeMap.has(storeKey)) {
        this.storeMap.set(storeKey, new StoreMapItemProxy(this._appStore, this._storeKey, storeKey));
      }
    }
  }

  releaseStore(storeKey: string) {
    this._keyRefs[storeKey] -= 1;
    if (this._keyRefs[storeKey] === 0) {
      // this.delete(storeKey);
      this._appStore.handleMainMapReleaseStores!(this._storeKey, [storeKey]);
      this.storeMap.delete(storeKey);
    }
  }

  request(keys: string | string[]): DisposableLike {
    if (!Array.isArray(keys)) {
      keys = [keys];
    }
    for (let key of keys) {
      this.requestStore(key);
    }
    let disposable = {
      dispose: () => {
        for (let key of keys) {
          this.releaseStore(key);
        }
      },
    };
    this._disposables.add(disposable);
    return disposable;
  }

  add(keys: string | string[]) {
    this.operateModeSwitch.enterDirectMode();

    this._appStore.handleDispatchNoReturn({ store: this._storeKey, method: "add", args: [keys] });

    const addOne = (key: string) => {
      if (this.storeMap.has(key)) {
        return;
      }
      this.storeMap.set(key, new StoreMapItemProxy(this._appStore, this._storeKey, key));
    };
    if (Array.isArray(keys)) {
      keys.forEach(key => addOne(key));
    } else {
      addOne(keys);
    }
  }

  delete(keys: string | string[]) {
    this._appStore.handleDispatchNoReturn({ store: this._storeKey, method: "delete", args: [keys] });

    if (Array.isArray(keys)) {
      keys.forEach(key => this.storeMap.delete(key));
    } else {
      this.storeMap.delete(keys);
    }
  }

  get(index: string) {
    return this.storeMap.get(index);
  }

  dispose() {
    this.storeMap.clear();
    this._disposables.dispose();
  }
}

type StoreMapProxyConstruct = new (appStore: IStoreDispatcher, storeKey: string) => StoreMapProxy;

export class StoreMapProxyDeclarer<T> extends StoreMapDeclarer<T> {
  create(appStore: AppStore & IStoreDispatcher): StoreMap<T> {
    let storeMapProxy = new StoreMapProxy(appStore, this.options!.storeKey!);
    return (storeMapProxy as any) as StoreMap<T>;
  }
}
