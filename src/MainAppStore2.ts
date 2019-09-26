import AppStore from "./AppStore";
import objectDifference from "./utils/objectDifference";
import filterDifference from "./utils/filterDifference";
import filterApply from "./utils/filterApply";
import { filterOneStore } from "./utils/filterStore";
import { filterWindowStore, filterWindowState, filterWindowDelta } from "./utils/filterWindowStore";
import { declareStore, StoreDeclarer, StoreListDeclarer, StoreMapDeclarer } from "./StoreDeclarer";
import MainClient from "./MainClient";
import MultiWinManagerStore, { WinPackStore } from "./MultiWinManagerStore";
import ActionRecordStore from "./ActionRecordStore";
import MultiWinStore from "./MultiWinStore";
import stateFilterDecorator from "./utils/stateFilterDecorator";
import loggerApply, { Log, Logger } from "./utils/loggerApply";

import { isEmpty, isObject } from "./utils/objUtils";
import { winManagerStoreName, winManagerKey } from "./constants";
import { serialize, deserialize } from "json-immutable-bn";
import IStoresDeclarer, { IStoresObjDeclarer } from "./IStoresDeclarer";
import IExtendStoreBase, { IExtendStoreBaseConstructor } from "./IExtendStoreBase";
import IMainClient, { IClientInfo } from "./IMainClient";
import IStoreFilters from "./IStoreFilters";

type OneStorePath = { name: string; type: string; index: string } | string;
function findStore(stores: { [storeKey: string]: any }, storePath: OneStorePath[] | undefined) {
  if (!storePath) {
    return;
  }
  return storePath.reduce((subStores, entry) => {
    if (!subStores) {
      return undefined;
    }
    if (!isObject(entry)) {
      return subStores[entry as string];
    }
    let { name, type, index } = entry as { name: string; type: string; index: string };
    let storeCol = subStores[name];
    if (type === "List" || type === "Map") {
      return storeCol.get(index);
    }
  }, stores);
}

function storeEnhancer(
  appStore: MultiWindowAppStore,
  stores: { [storeKey: string]: any },
  storeShape: IStoreFilters,
  log: Log
) {
  const callbacks = {
    addWin(clientId: string) {
      stores[winManagerStoreName].addWin(clientId);
    },
    deleteWin(clientId: string) {
      stores[winManagerStoreName].deleteWin(clientId);
    },
    getStores(clientId: string) {
      let nowStores = filterWindowStore(storeShape, winManagerStoreName, clientId);
      return JSON.stringify(nowStores);
    },
    getInitStates(clientId: string) {
      if (process.env.NODE_ENV === "development") {
        if (!appStore._prevStateFilters || !appStore._prevStateFilters[clientId]) {
          console.error("The filter should has init, If not, then should has a bug!");
        }
        if (appStore._prevStateFilters !== appStore._stateFilters) {
          console.error("The state filters should has update before get initial states!");
        }
        if (appStore.prevState !== appStore.state) {
          console.error("The state should has updated before get initial states!");
        }
      }

      let updateState = filterApply(appStore.prevState, appStore._prevStateFilters[clientId], null);
      let filterState = filterWindowState(updateState, winManagerKey, clientId);
      return serialize(filterState);
    },
    handleRendererMessage(payload: any) {
      try {
        const { store: storePath, method, args } = deserialize(payload);
        let store = findStore(stores, storePath);

        if (!store) {
          throw new Error(`The store for method ${method} is not defined`);
        }
        if (!store[method]) {
          throw new Error(`The method ${method} in Store ${store} is not defined`);
        }
        let result = store[method].apply(store, args);
        return Promise.resolve(result);
      } catch (err) {
        return Promise.reject(err);
      }
    },
  };

  const mainClient: IMainClient = new MainClient(callbacks, log);
  appStore.mainClient = mainClient;
  const forwarder = (prevState: any, state: any, prevFilters: any, filters: any) => {
    // Forward all actions to the listening renderers
    let clientInfo = mainClient.getForwardClients();

    if (clientInfo.length === 0) {
      return;
    }

    clientInfo.forEach(client => {
      let clientId = client.clientId;
      if (prevFilters[clientId] !== filters[clientId]) {
        let { updated, deleted } = filterDifference(prevFilters[clientId], filters[clientId]);
        let updateState = filterApply(state, updated, deleted);

        updateState = filterWindowState(updateState, winManagerKey, clientId);
        if (isEmpty(updateState)) {
          return;
        }
        mainClient.dispatchToRenderer(client, serialize({ payload: { updated: updateState } }));
      }
    });

    const delta = objectDifference(prevState, state);
    if (isEmpty(delta.updated) && isEmpty(delta.deleted)) {
      return;
    }

    clientInfo.forEach((client: IClientInfo) => {
      let { clientId } = client;

      let filterUpdated = filterApply(delta.updated, filters[clientId], null);
      let filterDeleted = filterApply(delta.deleted, filters[clientId], null);

      let [updated, deleted] = filterWindowDelta(filterUpdated, filterDeleted, winManagerKey, clientId);

      if (isEmpty(updated) && isEmpty(deleted)) {
        return;
      }

      const action = { payload: { updated, deleted } };

      mainClient.dispatchToRenderer(client, serialize(action));
    });
  };
  return forwarder;
}

class MultiWindowAppStore extends AppStore {
  static innerStores: { [storeKey: string]: any };
  storeShape: any;
  forwarder: any;
  _stateFilters: any;
  _prevStateFilters: any;

  filterCallbacks: Array<(filter: any) => void> = [];
  mainClient: any;
  log: Log;

  constructor(log: Log) {
    super();
    this.log = log;
  }

  init() {
    this.buildStores();
    this.initStores(this);

    this._initStateFilters();
    let winManagerStore = this.stores.winManagerStore;
    winManagerStore.onDidAddWin((clientId: string) => {
      this._handleAddWin(clientId);
      this._sendUpdate();
    });
    winManagerStore.onDidRemoveWin((clientId: string) => this._handleRemoveWin(clientId));
    this._prevStateFilters = Object.assign({}, this._stateFilters);

    this.startObserve();
    super.init();
    this.forwarder = storeEnhancer(this, this.stores, this.storeShape, this.log);
    return this;
  }

  handleWillFilterChange(prevState: any, state: any, prevFilters: any, filters: any) {
    return this.forwarder(prevState, state, prevFilters, filters);
  }
  onDidFilterChange(callback: (stateFilter: any) => void) {
    this.filterCallbacks.push(callback);
  }

  handleFilterChange() {
    this.batchUpdater.requestUpdate();
  }

  _sendUpdate() {
    this.handleWillFilterChange(this.prevState, this.state, this._prevStateFilters, this._stateFilters);
    this.didChangeCallbacks.forEach(callback => callback(this.state));
    this.prevState = this.state;
    this.filterCallbacks.forEach(callback => callback(this._stateFilters));
    this._prevStateFilters = Object.assign({}, this._stateFilters);
  }

  getStore(key: string) {
    return this.stores[key];
  }

  setStore(key: string, store: any) {
    return (this.stores[key] = store);
  }

  getStores() {
    return this.stores;
  }

  getWinSpecificStore(clientId: string, storeName: string) {
    let winStores = this.stores[winManagerStoreName].winPackMap[clientId];
    if (winStores) {
      return winStores[storeName];
    }
  }

  // 构建子Stores
  buildStores() {}
  // 初始化子Stores
  initStores(parent: MultiWindowAppStore) {}
  // 开始监听子Store改变
  startObserve() {}

  _initStateFilters() {}
  _handleAddWin(clientId: string) {}
  _handleRemoveWin(clientId: string) {}
}

export default function buildMultiWinAppStore(
  stores: IStoresObjDeclarer,
  winStores: IStoresObjDeclarer,
  { WindowsManagerStore = MultiWinManagerStore, ActionStore = ActionRecordStore, WinHandleStore = MultiWinStore },
  logger: Logger
) {
  WinPackStore.innerStores = { ...winStores, actionRecord: ActionStore };
  let allStores: IStoresObjDeclarer = {
    ...stores,
    multiWin: WinHandleStore,
    [winManagerKey]: declareStore(WindowsManagerStore, { storeKey: winManagerStoreName }),
  };
  let MultiWinAppStore = stateFilterDecorator((MultiWindowAppStore as any) as IExtendStoreBaseConstructor);
  MultiWinAppStore.innerStores = allStores;
  const storeShape = filterOneStore(MultiWinAppStore, { applyFilter: true });
  const appStore = new MultiWinAppStore(loggerApply(logger));
  (appStore as any).storeShape = storeShape;
  appStore.init();
  return appStore;
}
