import StoreBase, { buildStore, StoreBaseConstructor } from './StoreBase';
import { IExtendStoreBaseConstructor } from './IExtendStoreBase';

const IS_APP_STORE = '@@__APP_STORE__@@';

export class BatchUpdateHost {
  appStore: any;
  runState = 'idle';

  constructor(appStore: AppStore) {
    this.appStore = appStore;
  }

  // The AppStore need to update the state
  requestUpdate() {
    if (this.runState === 'idle') {
      this.runState = 'prepare';
      // Collect all of the update request and update AppStore After 20ms
      setTimeout(() => this.runUpdate(), 20);
    }
  }

  runUpdate() {
    this.runState = 'idle';
    this.appStore._sendUpdate();   //enable appStore update
  }
}

type IDidChangeCallback = (state: any) => void;

export default class AppStore {
  _init = false;
  didChangeCallbacks: IDidChangeCallback[] = [];

  batchUpdater: BatchUpdateHost;
  prevState: any = {};
  state: any = {};
  stores: any = {};

  static isAppStore(maybeAppStore: any) {
    return !!(maybeAppStore && maybeAppStore[IS_APP_STORE]);
  };
  
  constructor() {
    this.batchUpdater = new BatchUpdateHost(this);  
  }

  [IS_APP_STORE] = true;

  buildStore(storeClass: IExtendStoreBaseConstructor, args: any[], options?: any) {
    return buildStore(this, storeClass, args, options);
  }

  setState(state: any) {
    if (!this._init) {  // 未初始化完成
      Object.assign(this.state, state);
    } else {
      this.state = Object.assign({}, this.state, state);
      this.batchUpdater.requestUpdate();
    }
  }

  _sendUpdate() {
    this.handleWillChange && this.handleWillChange(this.prevState, this.state);
    this.didChangeCallbacks.forEach(callback => callback(this.state));
    this.prevState = this.state;
  }

  handleWillChange(prevState: any, state: any) {
  }
  
  onDidChange(callback: IDidChangeCallback) {
    this.didChangeCallbacks.push(callback);
  }

  init() {
    this._init = true;
    this.prevState = this.state;
    return this;
  }

  dispose() {
    this.didChangeCallbacks = [];
    for (var key in this.stores) {
      let store = this.stores[key];
      if (store instanceof StoreBase) {
        store.dispose();
      }
    }
    this.prevState = this.state = this.stores = null;
  }
}