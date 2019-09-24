import AppStore from './AppStore';
import objectMerge from './utils/objectMerge';
import { serialize, deserialize } from 'json-immutable-bn';
import StoreProxyHandler from './utils/StoreProxyHandler';
import RendererClient from './RendererClient';
import { Emitter } from 'event-kit';
import { filterOneStore } from './utils/filterStore';
import loggerApply, { Log, Logger } from './utils/loggerApply';
import IStoresDeclarer, { IStoresObjDeclarer } from './IStoresDeclarer';
import IExtendStoreBase, { IExtendStoreBaseConstructor } from './IExtendStoreBase';
import { StoreBaseConstructor } from './StoreBase';

class IDGenerator {
  count = 0;

  genID() {
    return ++this.count;
  }

  dispose(id: number) {
  }
}

export class RendererAppStore extends AppStore {
  emitter: Emitter = new Emitter();
  client: any;
  idGenerator = new IDGenerator();
  resolveMap: { [invokeId: string]: { resolve: (res: any) => void, reject: (err: Error) => void } } = {};
  storeShape: any;
  storeProxyHandler = new StoreProxyHandler();

  storeResolve?: () => void;
  storeReject?: (err: Error) => void;

  winInitParams: any;
  log: Log;

  static innerStores: IStoresDeclarer;

  constructor(log: Log) {
    super();
    this.log = log;
  }

  asyncInit() {
    super.init();

    // 先初始化，防止由于promise的异步 漏掉某些消息
    this.client = new RendererClient(
      this.handleStorePromise, 
      this.handleAction.bind(this), 
      this.handleResult.bind(this), 
      this.handleMessage.bind(this),
      this.handleWinMessage.bind(this),
      this.handleInitWindow.bind(this),
      this.log
    );
    return new Promise((resolve, reject) => {
      this.storeResolve = resolve;
      this.storeReject = reject;
    });
  }

  handleStorePromise = (state: any, store: any) => {
    this.handleStore(this.storeResolve!, this.storeReject!, state, store);
  };

  handleStore(resolve: () => void, reject: (err: Error) => void, state: any, store: any) {
    try {
      const storeData = deserialize(state);
      const initialState = storeData;
      this.state = initialState;
  
      const storeFilters = JSON.parse(store);
      let stores = this.storeProxyHandler.proxyStores(storeFilters, (action: any) => {
        let invokeId = this.idGenerator.genID();
        this.client.forward(invokeId, serialize(action));
        return new Promise((resolve, reject) => this.resolveMap[invokeId] = {resolve, reject});
      });
      this.stores = stores;
      this.initRenderStores();
      resolve();
    } catch (err) {
      reject(err);
    }
  }

  handleAction(actionStr: string) {
    let action = deserialize(actionStr);
    const { updated, deleted } = action.payload;
    // const withDeletions = filterObject(this.state, deleted);
    if (!this.state) return;
    this.state = objectMerge(this.state, updated, deleted);
    this.batchUpdater.requestUpdate();
  }

  handleResult(invokeId: number, error: Error, result: any) {
    this.idGenerator.dispose(invokeId);
    let {resolve, reject} = this.resolveMap[invokeId];
    delete this.resolveMap[invokeId];
    if (error) {
      reject(error);
    } else {
      // if (result !== undefined) result = JSON.parse(result);
      resolve(result);
    }
  }

  handleMessage(message: any) {
    this.emitter.emit('did-message', message);
  }

  handleWinMessage(senderId: string, message: any) {
    this.emitter.emit('did-win-message', {senderId, message});
  }

  handleInitWindow(params: any) {
    this.winInitParams = params;
    this.emitter.emit('did-init-window', params);
    this.log((logger) => logger("RendererAppStore", "init window", params))
  }

  observeInitWindow(callback: (params: any) => void) {
    if (this.winInitParams) {
      callback(this.winInitParams);
    } else {
      this.emitter.on('did-init-window', callback);
    }
  }

  sendWindowMessage(clientId: string, args: any) {
    this.client.sendWindowMessage(clientId, args);
  }

  onDidMessage(callback: (message: any) => void) {
    return this.emitter.on('did-message', callback);
  }

  onDidClose(callback: () => void) {
    return this.emitter.on('did-message', (message) => {
      if (message && message.action === 'did-close') callback();
    });
  }

  onDidWinMessage(callback: ({ senderId, message }: { senderId: string, message: any }) => void) {
    return this.emitter.on('did-win-message', callback);
  }

  initRenderStores() {
    this.buildStores();
    this.initStores(this);
    this.startObserve();
  }

  getStore(key: string) {
    return this.stores[key]
  }

  setStore(key: string, store: IExtendStoreBase) {
    return this.stores[key] = store;
  }

  // 构建子Stores
  buildStores() {}
  // 初始化子Stores
  initStores(parent: AppStore) {}
  // 开始监听子Store改变
  startObserve() {}
}

export default function buildRendererAppStore(stores: IStoresObjDeclarer, onChange: (state: any) => void, logger: Logger) {
  RendererAppStore.innerStores = stores;
  const storeShape = filterOneStore(RendererAppStore as any as IExtendStoreBaseConstructor);
  const appStore = new RendererAppStore(loggerApply(logger));
  appStore.onDidChange(onChange);
  appStore.storeShape = storeShape;
  return appStore;
}