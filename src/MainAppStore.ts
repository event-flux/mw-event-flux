import {
  AppStore,
  DispatchItem,
  AnyStoreDeclarer,
  StoreDeclarer,
  StoreListDeclarer,
  StoreMapDeclarer,
  OperateMode,
  StoreMap,
  StoreList,
} from "event-flux";
import {
  mainDispatchName,
  mainReturnName,
  renderDispatchName,
  renderRegisterName,
  messageName,
  winMessageName,
  initMessageName,
  mainInvokeName,
} from "./constants";
import MultiWinSaver from "./MultiWinSaver";
import { IMainClient, IMainClientCallback, IErrorObj, IWinProps, IWinInfo, IOutStoreDeclarer } from "./mainClientTypes";
import objectDifference from "./utils/objectDifference";
import { isEmpty, isObject } from "./utils/objUtils";
import filterApply from "./utils/filterApply";
import MainClient from "./MainClient";
import filterDifference from "./utils/filterDifference";
import { DisposableLike } from "event-kit";
import { serialize, deserialize } from "json-immutable-bn";

function getStoreType(storeDeclarer: AnyStoreDeclarer): "Item" | "List" | "Map" {
  if (StoreDeclarer.isStore(storeDeclarer)) {
    return "Item";
  } else if (StoreListDeclarer.isStoreList(storeDeclarer)) {
    return "List";
  } else if (StoreMapDeclarer.isStoreMap(storeDeclarer)) {
    return "Map";
  } else {
    throw new Error("Not valid store declarer");
  }
}

function genOutStoreDeclarers(appStore: AppStore) {
  let declarers: IOutStoreDeclarer[] = [];
  for (let key in appStore._storeRegisterMap) {
    let storeDeclarer = appStore._storeRegisterMap[key];
    let options = storeDeclarer.options!;
    let { storeKey, stateKey } = options;
    let { _evs, _invokers } = storeDeclarer.Store.prototype;
    let storeType = getStoreType(storeDeclarer);

    let outDeclarer: IOutStoreDeclarer = {
      storeKey: storeKey!,
      stateKey: stateKey!,
      storeType,
      depStoreNames: storeDeclarer.depStoreNames,
      _evs,
      _invokers,
    };
    if (storeType === "List") {
      outDeclarer.size = options.size;
      let { _evs: _mapEvs, _invokers: _mapInvokers } = (options.StoreList || StoreList).prototype;
      outDeclarer._mapEvs = _mapEvs;
      outDeclarer._mapInvokers = _mapInvokers;
    } else if (storeType === "Map") {
      outDeclarer.keys = options.keys;
      let { _evs: _mapEvs, _invokers: _mapInvokers } = (options.StoreMap || StoreMap).prototype;
      outDeclarer._mapEvs = _mapEvs;
      outDeclarer._mapInvokers = _mapInvokers;
    }
    declarers.push(outDeclarer);
  }
  return JSON.stringify(declarers);
}

interface IWinFilter {
  [storeKey: string]: true | false | IWinFilter;
}

export interface IAppStoreOptions {
  serializer: (value: any) => string;
  deserializer: (str: string) => any;
  MainClient?: IMainClient;
}

export default class MainAppStore extends AppStore implements IMainClientCallback {
  multiWinSaver: MultiWinSaver = new MultiWinSaver();
  winFilters: { [winId: string]: IWinFilter } = {};

  outStoreDeclarers: string = "";
  winHoldStores: { [winId: string]: Set<string> } = {};
  storeMapModes: { [storeMapKey: string]: OperateMode } = {};
  winObserves: { [winId: string]: { [invokeId: string]: DisposableLike } } = {};

  mainClient: IMainClient;

  serializer: (value: any) => string;
  deserializer: (str: string) => any;

  constructor(storeDeclarers?: AnyStoreDeclarer[], options?: IAppStoreOptions) {
    super(storeDeclarers, {});
    this.serializer = (options && options.serializer) || serialize;
    this.deserializer = (options && options.deserializer) || deserialize;

    let ClientClass = (options && options!.MainClient) || MainClient;
    this.mainClient = new ClientClass(this.multiWinSaver, this);
  }

  init() {
    super.init();
    // In main process, AppStore will not preload static stores, we need load them there
    this.preloadStaticStores();

    this.outStoreDeclarers = genOutStoreDeclarers(this);

    this.multiWinSaver.winInfos.forEach((winInfo: IWinInfo) => {
      this.winFilters[winInfo.winId] = {};
      this.winHoldStores[winInfo.winId] = new Set<string>();
      this.winObserves[winInfo.winId] = {};
    });
    this.multiWinSaver.onDidAddWin((winId: string) => {
      this.winFilters[winId] = {};
      this.winHoldStores[winId] = new Set<string>();
      this.winObserves[winId] = {};
    });
    this.multiWinSaver.onDidDeleteWin((winId: string) => {
      let winStoreKeys = this.winHoldStores[winId];
      for (let storeKey of winStoreKeys) {
        let mapStoreIndex = storeKey.split("@");
        if (mapStoreIndex.length === 1) {
          this.releaseStore(storeKey, winId);
        }
        // else {
        //   let store = this.stores[this._getStoreKey(mapStoreIndex[0], winId)] as StoreMap<any>;
        //   store.releaseStore(mapStoreIndex[1]);
        // }
      }
      delete this.winHoldStores[winId];
      delete this.winFilters[winId];
      delete this.winObserves[winId];
    });

    if (process.env.NODE_ENV !== "production") {
      this._checkStoreRegistry();
    }
    return this;
  }

  /**
   * The window-spec stores can dependen on the window-spec stores and plain stores
   * The plain stores can only dependen on the plain stores, not window-spec stores.
   */
  _checkStoreRegistry() {
    let storeRegistry = this._storeRegisterMap;
    for (let storeKey in storeRegistry) {
      let { options, depStoreNames } = storeRegistry[storeKey];
      if (!options!.isPerWin && depStoreNames && depStoreNames.length > 0) {
        let isAllPlainStores = depStoreNames.every(name => !storeRegistry[name].options!.isPerWin);
        if (!isAllPlainStores) {
          console.error(`The plain store ${storeKey} can not dependent on the window-spec stores`);
        }
      }
    }
  }

  requestStore(storeKey: string, winId: string): DispatchItem {
    return super.requestStore(storeKey, winId);
  }

  releaseStore(storeKey: string, winId: string): void {
    return super.releaseStore(storeKey, winId);
  }

  _getStoreKey(storeKey: string, winId: string) {
    let isPerWin = (this._storeRegisterMap[storeKey].options! as any).isPerWin;
    if (isPerWin) {
      if (!winId) {
        throw new Error("The winId parameter is necessary when creating isPerWin store ");
      }
      storeKey = storeKey + "@" + winId;
    }
    return storeKey;
  }

  _parseStoreKey(finalStoreKey: string): [string, string] {
    let [storeKey, winId] = finalStoreKey.split("@");
    return [storeKey, winId];
  }

  _getStateKey(storeKey: string, stateKey: string, winId?: any) {
    let isPerWin = (this._storeRegisterMap[storeKey].options! as any).isPerWin;
    if (isPerWin) {
      if (!winId) {
        throw new Error("The winId parameter is necessary when creating isPerWin store ");
      }
      stateKey = stateKey + "@" + winId;
    }
    return stateKey;
  }

  _createStore(storeKey: string, store: DispatchItem, winId: string) {
    let { isPerWin } = this._storeRegisterMap[storeKey].options! as any;
    if (isPerWin) {
      if (!winId) {
        throw new Error("The winId parameter is necessary when creating isPerWin store ");
      }
      storeKey = storeKey + "@" + winId;
      store.winId = winId;
    }
    this.stores[storeKey] = store;
  }

  _deleteStore(storeKey: string, winId: string) {
    let { isPerWin } = this._storeRegisterMap[storeKey].options! as any;
    if (isPerWin) {
      if (!winId) {
        throw new Error("The winId parameter is necessary when delete isPerWin store ");
      }
      storeKey = storeKey + "@" + winId;
    }
    delete this.stores[storeKey];
  }

  _getStoreMethod(storeKey: string, winId: string, method: string, index?: string) {
    let store = this.stores[this._getStoreKey(storeKey, winId)];
    if (!store) {
      throw new Error(`The store ${storeKey} for winId ${winId} is not exists`);
    }

    if (index !== undefined) {
      store = store.get(index);
      if (!store) {
        throw new Error(`The store ${storeKey}'s sub key ${index} store is not exists`);
      }
    }

    if (!(store as any)[method]) {
      throw new Error(`The store ${storeKey}'s method ${method} is not exists`);
    }
    return (store as any)[method].bind(store);
  }

  async _handleRendererPayload(winId: string, payload: string): Promise<any> {
    let { store: storeKey, method, index, args } = this.deserializer(payload);
    let result = await this._getStoreMethod(storeKey, winId, method, index)(...args);
    return result;
  }

  handleRendererDispatch(winId: string, invokeId: string, stringifiedAction: string) {
    let winInfo = this.multiWinSaver.getWinInfo(winId);
    if (!winInfo) {
      return;
    }
    return this._handleRendererPayload(winId, stringifiedAction).then(
      result => {
        this.mainClient.sendWinMsg(
          winInfo,
          mainReturnName,
          invokeId,
          undefined,
          result !== undefined ? this.serializer(result) : result
        );
      },
      err => {
        let errObj: IErrorObj | null = null;

        if (err) {
          errObj = { name: err.name, message: err.message } as IErrorObj;
          if (errObj) {
            Object.keys(err).forEach(key => (errObj![key] = err[key]));
          }
        }

        this.mainClient.sendWinMsg(winInfo, mainReturnName, invokeId, errObj, undefined);

        if (process.env.NODE_ENV === "development") {
          throw err;
        }
      }
    );
  }

  handleRendererDispatchNoReturn(winId: string, stringifiedAction: string): void {
    let winInfo = this.multiWinSaver.getWinInfo(winId);
    if (!winInfo) {
      return;
    }
    this._handleRendererPayload(winId, stringifiedAction);
  }

  handleRendererDispatchObserve(winId: string, invokeId: string, action: any) {
    let { store: storeKey, method, index } = action;
    let storeMethod = this._getStoreMethod(storeKey, winId, method, index);
    this.winObserves[winId][invokeId] = storeMethod((...args: any[]) => {
      let winInfo = this.multiWinSaver.getWinInfo(winId);
      if (!winInfo) {
        return;
      }
      this.mainClient.sendWinMsg(winInfo, mainInvokeName, invokeId, args);
    });
  }

  handleRendererDispatchDispose(winId: string, invokeId: string) {
    let disposable = this.winObserves[winId][invokeId];
    if (disposable) {
      disposable.dispose();
      delete this.winObserves[winId][invokeId];
    }
  }

  handleWinMessage(senderId: string, targetId: string, data: any) {
    let winInfo = this.multiWinSaver.getWinInfo(targetId);
    if (!winInfo) {
      return;
    }
    this.multiWinSaver.whenRegister(winInfo.winId, () => {
      this.mainClient.sendWinMsg(winInfo, winMessageName, senderId, data);
    });
  }

  handleRegisterWin(winId: string) {
    // If the winId has registered, that may be hot reload, we need delete the window and add again.
    if (this.multiWinSaver.isRegister(winId)) {
      let winInfo = this.multiWinSaver.getWinInfo(winId);
      this.multiWinSaver.deleteWin(winId);
      this.multiWinSaver.addWin(winInfo);
      this.initWin(winId, { state: this.serializer(this.prevState) });
    } else {
      this.multiWinSaver.registerWin(winId);
    }
  }

  initWin(winId: string, params: IWinProps) {
    let winInfo = this.multiWinSaver.getWinInfo(winId);
    if (!winInfo) {
      return;
    }
    this.multiWinSaver.whenRegister(winInfo.winId, () => {
      this.mainClient.sendWinMsg(winInfo, initMessageName, params);
    });
  }

  _applyFilterForStore(winFilter: IWinFilter, winId: string, storeKeys: string[], forAdd: boolean) {
    let newFilter = { ...winFilter };

    for (let storeKey of storeKeys) {
      let depList = [storeKey];
      for (let i = 0; i < depList.length; i += 1) {
        let curStoreKey = depList[i];
        let storeDeclarer = this._storeRegisterMap[curStoreKey];
        if (!storeDeclarer) {
          console.error(`The store key ${curStoreKey} is not registered`);
        }
        let { depStoreNames, options } = storeDeclarer;

        let filterKey = this._getStateKey(curStoreKey, options!.stateKey!, winId);
        if (forAdd ? newFilter[filterKey] : newFilter[filterKey] === undefined) {
          continue;
        }
        if (forAdd) {
          newFilter[filterKey] = this.storeMapModes[curStoreKey] === OperateMode.RefCount ? {} : true;
        } else {
          delete newFilter[filterKey];
        }

        depList.splice(depList.length, 0, ...(depStoreNames || []));
      }
    }
    return newFilter;
  }

  handleRequestStores(winId: string, storeKeys: string[]) {
    let winStores = this.winHoldStores[winId];
    for (let storeKey of storeKeys) {
      if (winStores.has(storeKey)) {
        console.error(`The store ${storeKey} for win ${winId} has requested, This may be renderer bug `);
        continue;
      }
      winStores.add(storeKey);

      this.requestStore(storeKey, winId);
    }

    // Update the store's filter for this window
    let winFilter = this.winFilters[winId];
    let newFilter = this._applyFilterForStore(winFilter, winId, storeKeys, true);
    this.forwardDeltaFilter(winId, winFilter, newFilter);
    this.winFilters[winId] = newFilter;
  }

  handleReleaseStores(winId: string, storeKeys: string[]) {
    let winStores = this.winHoldStores[winId];
    for (let storeKey of storeKeys) {
      if (!winStores.has(storeKey)) {
        console.error(`The store ${storeKey} for win ${winId} has released, This may be renderer bug `);
        continue;
      }
      this.releaseStore(storeKey, winId);

      winStores.delete(storeKey);
    }

    // Update the store's filter for this window
    let winFilter = this.winFilters[winId];
    let newFilter = this._applyFilterForStore(winFilter, winId, storeKeys, false);
    this.forwardDeltaFilter(winId, winFilter, newFilter);
    this.winFilters[winId] = newFilter;
  }

  handleMapRequestStores(winId: string, storeKey: string, mapKeys: string[]): void {
    let winStores = this.winHoldStores[winId];
    for (let mapKey of mapKeys) {
      let mapStoreKey = storeKey + "@" + mapKey;
      if (winStores.has(mapStoreKey)) {
        console.error(
          `The map store ${storeKey}'s ${mapKey} for win ${winId} has requested, This may be renderer bug `
        );
        continue;
      }
      winStores.add(mapStoreKey);

      let store = this.stores[this._getStoreKey(storeKey, winId)] as StoreMap<any>;
      store.requestStore(mapKey);
    }
    // StoreMap's OperateMode change from Direct to RefCount,
    // then this storeMap filter for all the win should change to {}
    if (this.storeMapModes[storeKey] !== OperateMode.RefCount) {
      this.storeMapModes[storeKey] = OperateMode.RefCount;

      let { options } = this._storeRegisterMap[storeKey];

      this.multiWinSaver.winInfos.forEach(winInfo => {
        let filterKey = this._getStateKey(storeKey, options!.stateKey!, winInfo.winId);
        let winFilter = this.winFilters[winInfo.winId];
        winFilter[filterKey] = {};
      });
    }

    // Update this winId's storeMap filter and forward this filter to renderer process.
    let thisWinFilter = this.winFilters[winId];
    let { options: thisOptions } = this._storeRegisterMap[storeKey];
    let thisStateKey = this._getStateKey(storeKey, thisOptions!.stateKey!, winId);

    let mapFilter = thisWinFilter[thisStateKey] as IWinFilter;
    let newMapFilter = { ...mapFilter };
    for (let mapKey of mapKeys) {
      newMapFilter[mapKey] = true;
    }
    this.forwardDeltaFilter(winId, { [thisStateKey]: mapFilter }, { [thisStateKey]: newMapFilter });
    thisWinFilter[thisStateKey] = newMapFilter;
  }

  handleMapReleaseStores(winId: string, storeKey: string, mapKeys: string[]): void {
    let winStores = this.winHoldStores[winId];
    for (let mapKey of mapKeys) {
      let mapStoreKey = storeKey + "@" + mapKey;
      if (!winStores.has(mapStoreKey)) {
        console.error(`The map store ${storeKey}'s ${mapKey} for win ${winId} has released, This may be renderer bug `);
        continue;
      }
      winStores.delete(mapStoreKey);

      let store = this.stores[this._getStoreKey(storeKey, winId)] as StoreMap<any>;
      store.releaseStore(mapKey);
    }

    // Update this winId's storeMap filter and forward this filter to renderer process.
    let winFilter = this.winFilters[winId];
    let { options } = this._storeRegisterMap[storeKey];
    let thisStateKey = this._getStateKey(storeKey, options!.stateKey!, winId);

    let mapFilter = winFilter[thisStateKey] as IWinFilter;
    let newMapFilter = { ...mapFilter };
    for (let mapKey of mapKeys) {
      delete newMapFilter[mapKey];
    }
    this.forwardDeltaFilter(winId, { [thisStateKey]: mapFilter }, { [thisStateKey]: newMapFilter });
    winFilter[thisStateKey] = newMapFilter;
  }

  getStoreDeclarers(): string {
    return this.outStoreDeclarers;
  }

  _transformWinState(finalState: any) {
    // Transform the win specific state that remove the window suffix
    for (let stateKey in finalState) {
      let [realKey, id] = stateKey.split("@");
      if (id) {
        finalState[realKey] = finalState[stateKey];
        delete finalState[stateKey];
      }
    }
    return finalState;
  }

  getInitStates(winId: string): string {
    let winFilter = this.winFilters[winId];
    let state = this.prevState;
    let finalState: any = {};

    // Generate the new final state by the win filter
    for (let iFilter in winFilter) {
      if (Array.isArray(iFilter)) {
        let [stateKey, keys] = iFilter;
        finalState[stateKey] = {};
        for (let key of keys) {
          finalState[stateKey][key] = state[stateKey][key];
        }
      } else {
        finalState[iFilter] = state[iFilter];
      }
    }

    return this.serializer(this._transformWinState(finalState));
  }

  handleWillChange(prevState: any, state: any) {
    this.forwardState(prevState, state);
  }

  forwardState(prevState: any, state: any) {
    const delta = objectDifference(prevState, state);
    if (isEmpty(delta.updated) && isEmpty(delta.deleted)) {
      return;
    }

    let winFilters = this.winFilters;

    this.multiWinSaver.winInfos.forEach((client: IWinInfo) => {
      let { winId } = client;

      let filterUpdated = filterApply(delta.updated, winFilters[winId]);
      let filterDeleted = filterApply(delta.deleted, winFilters[winId]);

      filterUpdated = this._transformWinState(filterUpdated);
      filterDeleted = this._transformWinState(filterDeleted);

      // let [updated, deleted] = filterWindowDelta(filterUpdated, filterDeleted, winManagerKey, clientId);
      if (!isEmpty(filterUpdated) || !isEmpty(filterDeleted)) {
        const action = { updated: filterUpdated, deleted: filterDeleted };
        this.mainClient.sendWinMsg(client, mainDispatchName, this.serializer(action));
      }
    });
  }

  forwardDeltaFilter(winId: string, prevFilter: IWinFilter, newFilter: IWinFilter) {
    let { updated, deleted } = filterDifference(prevFilter, newFilter);
    let updateState = filterApply(this.prevState, updated);

    updated = this._transformWinState(updateState);
    deleted = this._transformWinState(deleted);

    if (!isEmpty(updated) || !isEmpty(deleted)) {
      const action = { updated, deleted };
      this.mainClient.sendWinMsg(this.multiWinSaver.getWinInfo(winId), mainDispatchName, this.serializer(action));
    }
  }
}
