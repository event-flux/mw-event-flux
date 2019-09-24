import { initStore, disposeStore } from './storeBuilder';
import { Emitter, Disposable } from 'event-kit';
import IExtendStoreBase from '../IExtendStoreBase';
// import { addStateFilter } from './stateFilterDecorator';

type StoreBuilder = () => IExtendStoreBase;
type StoreObserver = (store: IExtendStoreBase, i: number) => Disposable;

export default class StoreList {
  length: number = 0;
  storeArray: IExtendStoreBase[] = [];
  disposables: Disposable[] = [];
  options: any;
  builder: StoreBuilder;
  observer: StoreObserver;
  parentStore: any = null;
  appStores: any;
  emitter = new Emitter();

  constructor(size: number, builder: StoreBuilder, observer: StoreObserver, options: any) {
    this.builder = builder;
    this.observer = observer;
    this.options = options;
    if (size) this.setSize(size);
  }

  _initWrap() {
    // this._isInit = true;
  }

  setSize(count: number) {
    if (this.length === count) return;
    if (this.length < count) {
      for (let i = this.length; i < count; ++i) {
        let newStore = this.builder();
        (newStore as any).listStoreKey = i;

        // if (this._isInit) initStore(newStore);
        initStore(newStore, this.parentStore);
        this.storeArray.push(newStore);
        this.disposables.push(this.observer(newStore, i));
      }
    } else {
      for (let i = count; i < this.length; ++i) {
        this.disposables[i].dispose();
        disposeStore(this.storeArray[i]);
      }
      this.disposables.splice(count, this.length - count);
      this.storeArray.splice(count, this.length - count);
    }
    this.length = count;
  }

  dispose() {
    this.setSize(0);
  }

  forEach(callback: (value: IExtendStoreBase, index: number, array: IExtendStoreBase[]) => void) { 
    return this.storeArray.forEach(callback); 
  }

  map(callback: (value: IExtendStoreBase, index: number, array: IExtendStoreBase[]) => any) { 
    return this.storeArray.map(callback); 
  }
  filter(callback: (value: IExtendStoreBase, index: number, array: IExtendStoreBase[]) => boolean) { 
    return this.storeArray.filter(callback); 
  }
  get(index: number) { return this.storeArray[index]; }
  slice(begin: number, end: number) { return this.storeArray.slice(begin, end); }
  indexOf(item: IExtendStoreBase) { return this.storeArray.indexOf(item); }
}
