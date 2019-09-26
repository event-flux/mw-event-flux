import { initStore, disposeStore } from "./storeBuilder";
import { Emitter } from "event-kit";
import IExtendStoreBase from "../IExtendStoreBase";

type StoreBuilder = () => IExtendStoreBase | undefined;
type StoreMapObserver = (store: IExtendStoreBase, index: string) => void;

export type StoreMapConstructor = new (
  keys: string[] | null,
  builder: StoreBuilder,
  observer: StoreMapObserver,
  options: any
) => StoreMap;

export default class StoreMap {
  storeMap: Map<string, any> = new Map();
  disposables = new Map();
  options: any;
  builder: StoreBuilder;
  observer: any;
  parentStore: any = null;
  appStores: any;
  emitter = new Emitter();

  constructor(keys: string[] | null, builder: StoreBuilder, observer: StoreMapObserver, options: any) {
    this.builder = builder;
    this.observer = observer;
    this.options = options;
    if (Array.isArray(keys)) {
      keys.forEach(key => this.add(key));
    }
  }

  _initWrap() {
    // this._isInit = true;
  }

  add(key: string, prevInit?: (store: IExtendStoreBase) => void): IExtendStoreBase | undefined {
    if (this.storeMap.has(key)) {
      return;
    }
    let newStore = this.builder();
    if (newStore) {
      (newStore as any).mapStoreKey = key;
      prevInit && prevInit(newStore);

      // if (this._isInit) initStore(newStore);
      initStore(newStore, this.parentStore);
      this.storeMap.set(key, newStore);
      this.disposables.set(key, this.observer(newStore, key));
      return newStore;
    }
  }

  delete(key: string) {
    let store = this.storeMap.get(key);
    store && disposeStore(store);
    this.storeMap.delete(key);
    let disposable = this.disposables.get(key);
    disposable && disposable.dispose();
    this.disposables.delete(key);
  }

  clear() {
    let stores = this.storeMap.values();
    for (let store of stores) {
      disposeStore(store);
    }
    this.storeMap.clear();
    let disposables = this.disposables.values();
    for (let d of disposables) {
      d.dispose();
    }
    this.disposables.clear();
  }

  dispose() {
    this.clear();
  }

  forEach(callback: (value: any, key: string, map: Map<string, any>) => void) {
    return this.storeMap.forEach(callback);
  }

  get(key: string) {
    return this.storeMap.get(key);
  }

  has(key: string) {
    return this.storeMap.has(key);
  }

  keys() {
    return this.storeMap.keys();
  }

  values() {
    return this.storeMap.values();
  }

  entries() {
    return this.storeMap.entries();
  }
}
