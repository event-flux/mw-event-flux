import { Emitter } from 'event-kit';
import AppStore from './AppStore';
import IStoresDeclarer from './IStoresDeclarer';
import IExtendStoreBase, { IExtendStoreBaseConstructor } from './IExtendStoreBase';

export const IS_STORE = '@@__FLUX_STORE__@@';

// storeClass must be factory or class.
export function buildStore(appStore: AppStore, storeClass: IExtendStoreBaseConstructor, args: any[] = [], options?: any): IExtendStoreBase {
  let store = new storeClass(...args);
  store._appStore = appStore;
  store.appStores = appStore.stores;
  store.options = options;
  return store;
}

export interface StoreBaseConstructor {
  new (...args: any[]): StoreBase;

  innerStores: IStoresDeclarer;
}

export default class StoreBase {
  appStores: { [name: string]: any } = {};
  _appStore: AppStore | undefined;
  options: any;
  parentStore: StoreBase | undefined;

  state: any = {};

  emitter = new Emitter();
  inWillUpdate = false;
  willUpdateStates: any[] = [];

  _isInit = false

  static isStore(maybeStore: any) {
    return !!(maybeStore && maybeStore["__FLUX_STORE__"]);
  };
  static innerStores: IStoresDeclarer;

  __FLUX_STORE__ = true;

  _initWrap() {
    if (!this._isInit) {
      this.init && this.init();
      this._isInit = true;
    }
  }

  willInit() {}

  init() {}

  // Create new store from storeClass. storeClass must be factory or class.  
  buildStore(storeClass: IExtendStoreBaseConstructor, args: any[], options?: any): IExtendStoreBase | undefined {
    if (!this._appStore) {
      console.error('Can not invoke buildStore in constructor');
      return;
    }
    return buildStore(this._appStore, storeClass, args, options);
  }

  setState(state: any): void {
    // 当will-update，将状态保存到缓存队列中
    if (this.inWillUpdate) {
      this.willUpdateStates.push(state);
      return;
    }
    // Make the update delay to next tick that can collect many update into one operation.
    let nextState = Object.assign({}, this.state, state); 

    this.inWillUpdate = true;   
    // will-update时，可能会调用setState，新的state将会保存在willUpdateStates队列中
    this.emitter.emit('will-update', nextState);  
    this.inWillUpdate = false;

    if (this.willUpdateStates.length > 0) {
      this.state = this.willUpdateStates.reduce((allState, state) => 
        Object.assign(allState, state
      ), nextState);
      this.willUpdateStates = [];
    } else {
      this.state = nextState;
    }

    // Send update notification.
    this.emitter.emit('did-update', this.state);
  }

  onDidUpdate(callback: (state: any) => void) {
    return this.emitter.on('did-update', callback);
  }

  onWillUpdate(callback: (state: any) => void) {
    return this.emitter.on('will-update', callback);    
  }

  observe(callback: (state: any) => void) {
    callback(this.state);
    return this.emitter.on('did-update', callback);    
  }

  dispose() {
    this.emitter.dispose();
  }

  destroy() {}

  getState() {
    return this.state;
  }
}