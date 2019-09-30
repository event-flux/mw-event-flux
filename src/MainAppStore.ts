import {
  AppStore,
  DispatchItem,
  AnyStoreDeclarer,
  StoreDeclarer,
  StoreListDeclarer,
  StoreMapDeclarer,
} from "event-flux";
import {
  mainInitName,
  mainDispatchName,
  mainReturnName,
  renderDispatchName,
  renderRegisterName,
  messageName,
  winMessageName,
  initMessageName,
} from "./constants";
import IErrorObj from "./IErrorObj";
import MultiWinSaver from "./MultiWinSaver";
import { IMainClient, IMainClientCallback, IWinProps, IWinInfo, IOutStoreDeclarer } from "./mainClientTypes";
import objectDifference from "./utils/objectDifference";
import { isEmpty, isObject } from "./utils/objUtils";
import filterApply from "./utils/filterApply";
import MainClient from "./MainClient";
import filterDifference from "./utils/filterDifference";

function getStoreType(storeDeclarer: AnyStoreDeclarer) {
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
    let { storeKey, stateKey } = storeDeclarer.options!;
    declarers.push({
      storeKey: storeKey!,
      stateKey: stateKey!,
      storeType: getStoreType(storeDeclarer),
      depStoreNames: storeDeclarer.depStoreNames,
    });
  }
  return JSON.stringify(declarers);
}

interface IWinFilter {
  [storeKey: string]: true | false | IWinFilter;
}

export default class MainAppStore extends AppStore implements IMainClientCallback {
  multiWinSaver: MultiWinSaver = new MultiWinSaver();
  winFilters: { [winId: string]: IWinFilter } = {};

  outStoreDeclarers: string = "";
  winHoldStores: { [winId: string]: Set<string> } = {};

  mainClient: IMainClient = new MainClient(this.multiWinSaver, this);

  init() {
    super.init();

    this.outStoreDeclarers = genOutStoreDeclarers(this);

    this.multiWinSaver.onDidAddWin((winId: string) => {
      this.winFilters[winId] = {};
      this.winHoldStores[winId] = new Set<string>();
    });
    this.multiWinSaver.onDidDeleteWin((winId: string) => {
      let winStoreKeys = this.winHoldStores[winId];
      for (let storeKey of winStoreKeys) {
        this.releaseStore(storeKey, winId);
      }
      delete this.winHoldStores[winId];
      delete this.winFilters[winId];
    });
    return this;
  }

  _sendUpdate() {
    super._sendUpdate();
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

  /**
   * When the renderer process request the StoreMap's stores, then we need change the filter
   *
   * @param storeKey: the StoreMap's storeKey
   * @param keys: the StoreMap's keys that the renderer process will use
   * @param winId: the renderer process's window ID
   */
  _requestStoreMapFilter(storeKey: string, keys: string[], winId: string) {
    let { isPerWin, stateKey } = this._storeRegisterMap[storeKey].options! as any;
    // If the storeMap exists per window, then the filter is not necessary.
    if (isPerWin) {
      return;
    }

    let winFilter = this.winFilters[winId];
    let storeFilter = winFilter[storeKey];
    if (!storeFilter || typeof storeFilter === "boolean") {
      storeFilter = winFilter[storeKey] = {};
    }
    for (let key of keys) {
      winFilter[key] = true;
    }
  }

  _createStore(storeKey: string, store: DispatchItem, winId: string) {
    let { isPerWin, stateKey } = this._storeRegisterMap[storeKey].options! as any;
    if (isPerWin) {
      if (!winId) {
        throw new Error("The winId parameter is necessary when creating isPerWin store ");
      }

      stateKey = stateKey + "@" + winId;
      storeKey = storeKey + "@" + winId;
    }
    this.stores[storeKey] = store;
  }

  _deleteStore(storeKey: string, winId: string) {
    let { isPerWin, stateKey } = this._storeRegisterMap[storeKey].options! as any;
    if (isPerWin) {
      if (!winId) {
        throw new Error("The winId parameter is necessary when delete isPerWin store ");
      }

      stateKey = stateKey + "@" + winId;
      storeKey = storeKey + "@" + winId;
    }
    // Delete the stateKey from winFilter
    delete this.winFilters[winId][stateKey];

    delete this.stores[storeKey];
  }

  async _handleRendererPayload(payload: string): Promise<any> {}

  handleRendererDispatch(winId: string, invokeId: string, stringifiedAction: string) {
    let winInfo = this.multiWinSaver.getWinInfo(winId);
    if (!winInfo) {
      return;
    }
    this._handleRendererPayload(stringifiedAction).then(
      result => {
        this.mainClient.sendWinMsg(winInfo, mainReturnName, invokeId, undefined, result);
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

        if (process.env.NODE_ENV !== "production") {
          throw err;
        }
      }
    );
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
        let { depStoreNames, options } = this._storeRegisterMap[curStoreKey];

        let filterKey = this._getStateKey(options!.stateKey!, winId);
        if (forAdd ? newFilter[filterKey] : newFilter[filterKey] === undefined) {
          continue;
        }
        if (forAdd) {
          newFilter[filterKey] = true;
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
      this.releaseStore(storeKey, winId);

      winStores.delete(storeKey);
    }

    // Update the store's filter for this window
    let winFilter = this.winFilters[winId];
    let newFilter = this._applyFilterForStore(winFilter, winId, storeKeys, false);
    this.forwardDeltaFilter(winId, winFilter, newFilter);
    this.winFilters[winId] = newFilter;
  }

  getStoreDeclarers(): string {
    return this.outStoreDeclarers;
  }

  _transformWinState(finalState: any) {
    // Transform the win specific state that remove the window suffix
    for (let stateKey in finalState) {
      let [realKey, id] = stateKey.split("&");
      if (id) {
        delete finalState[stateKey];
        finalState[realKey] = finalState[stateKey];
      }
    }
  }

  getInitStates(winId: string): string {
    let winFilter = this.winFilters[winId];
    let state = this.state;
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

    this._transformWinState(finalState);

    return JSON.stringify(finalState);
  }

  forwardState(prevState: any, state: any) {
    const delta = objectDifference(prevState, state);
    if (isEmpty(delta.updated) && isEmpty(delta.deleted)) {
      return;
    }

    let winFilters = this.winFilters;

    this.multiWinSaver.winInfos.forEach((client: IWinInfo) => {
      let { winId } = client;

      let filterUpdated = filterApply(delta.updated, winFilters[winId], null);
      let filterDeleted = filterApply(delta.deleted, winFilters[winId], null);

      this._transformWinState(filterUpdated);
      this._transformWinState(filterDeleted);

      // let [updated, deleted] = filterWindowDelta(filterUpdated, filterDeleted, winManagerKey, clientId);
      if (isEmpty(filterUpdated) && isEmpty(filterDeleted)) {
        return;
      }

      const action = { updated: filterUpdated, deleted: filterDeleted };

      this.mainClient.sendWinMsg(client, mainDispatchName, JSON.stringify(action));
    });
  }

  forwardDeltaFilter(winId: string, prevFilter: IWinFilter, newFilter: IWinFilter) {
    let { updated, deleted } = filterDifference(prevFilter, newFilter);
    let updateState = filterApply(this.state, updated, deleted);

    const action = { updated: updateState };

    this.mainClient.sendWinMsg(this.multiWinSaver.getWinInfo(winId), mainDispatchName, JSON.stringify(action));
  }
}
