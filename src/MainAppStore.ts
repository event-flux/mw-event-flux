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
import { IMainClientCallback, IWinProps, IWinInfo, IOutStoreDeclarer } from "./mainClientTypes";
import { serialize, deserialize } from "json-immutable-bn";
import objectDifference from "./utils/objectDifference";
import { isEmpty, isObject } from "./utils/objUtils";
import filterApply from "./utils/filterApply";
import BrowserMainClient from "./browser/BrowserMainClient";

interface IMainClient {
  sendWinMsg(winInfo: IWinInfo, msgName: string, ...args: any[]): void;
}

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

export default class MainAppStore extends AppStore implements IMainClientCallback {
  winSpecStores: { [winId: string]: Set<string> } = {};
  multiWinSaver: MultiWinSaver = new MultiWinSaver();
  winFilters: { [winId: string]: Array<string | [string, string[]]> } = {};

  outStoreDeclarers: string = "";
  winHoldStores: { [winId: string]: string[] } = {};

  mainClient: IMainClient = new BrowserMainClient(this.multiWinSaver, this);

  init() {
    super.init();

    this.outStoreDeclarers = genOutStoreDeclarers(this);

    this.multiWinSaver.onDidAddWin((winId: string) => {
      this.winSpecStores[winId] = new Set<string>();
      this.winFilters[winId] = [];
    });
    this.multiWinSaver.onDidDeleteWin((winId: string) => {
      let winStoreKeys = this.winHoldStores[winId];
      for (let storeKey of winStoreKeys) {
        this.releaseStore(storeKey, winId);
      }

      let storeKeys = this.winSpecStores[winId];
      // Dispose all win specific stores.
      for (let storeKey of storeKeys) {
        let winStoreKey = storeKey + "@" + winId;
        while (this.stores[winStoreKey] && this.stores[winStoreKey].getRefCount() > 0) {
          this.releaseStore(storeKey, winId);
        }
      }

      delete this.winSpecStores[winId];
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

  _requestStoreMapFilter(storeKey: string, keys: string[], winId: string) {
    let { isPerWin, stateKey } = this._storeRegisterMap[storeKey].options! as any;
    // If the storeMap exists per window, then the filter is not necessary.
    if (isPerWin) {
      return;
    }
    // let filters = this.winFilters[winId];
    let filterIndex = this.winFilters[winId].findIndex(item => {
      if (Array.isArray(item)) {
        item = item[0];
      }
      return item === stateKey;
    });
    if (filterIndex !== -1) {
      this.winFilters[winId][filterIndex] = [stateKey, keys];
    } else {
      this.winFilters[winId].push([stateKey, keys]);
    }
  }

  _createStore(storeKey: string, store: DispatchItem, winId: string) {
    let { isPerWin, stateKey } = this._storeRegisterMap[storeKey].options! as any;
    if (isPerWin) {
      if (!winId) {
        throw new Error("The winId parameter is necessary when creating isPerWin store ");
      }

      // Add storeKey into the win specific store container.
      let winStores = this.winSpecStores[winId];
      if (!winStores) {
        winStores = this.winSpecStores[winId] = new Set<string>();
      }
      winStores.add(storeKey);

      stateKey = stateKey + "@" + winId;
      storeKey = storeKey + "@" + winId;
    }
    // Add the win specific stateKey into the winFilter
    this.winFilters[winId].push(stateKey);

    this.stores[storeKey] = store;
  }

  _deleteStore(storeKey: string, winId: string) {
    let { isPerWin, stateKey } = this._storeRegisterMap[storeKey].options! as any;
    if (isPerWin) {
      if (!winId) {
        throw new Error("The winId parameter is necessary when delete isPerWin store ");
      }

      // Delete the storeKey from the win specific stores.
      let winStores = this.winSpecStores[winId];
      winStores.delete(storeKey);

      stateKey = stateKey + "@" + winId;
      storeKey = storeKey + "@" + winId;
    }
    // Delete the stateKey from winFilter
    let filterIndex = this.winFilters[winId].indexOf(stateKey);
    if (filterIndex !== -1) {
      this.winFilters[winId].splice(filterIndex);
    }

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

  handleRequestStores(winId: string, storeKeys: string[]) {
    let winStores = this.winHoldStores[winId];
    if (!winStores) {
      winStores = this.winHoldStores[winId] = [];
    }
    winStores.splice(winStores.length, 0, ...storeKeys);

    for (let storeKey of storeKeys) {
      this.requestStore(storeKey, winId);
    }
  }

  handleReleaseStores(winId: string, storeKeys: string[]) {
    let winStores = this.winHoldStores[winId];
    for (let storeKey of storeKeys) {
      this.releaseStore(storeKey, winId);

      let index = winStores.indexOf(storeKey);
      if (index !== -1) {
        winStores.splice(index, 1);
      }
    }
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
    for (let iFilter of winFilter) {
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

    return serialize(finalState);
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

      const action = { payload: { filterUpdated, filterDeleted } };

      this.mainClient.sendWinMsg(client, mainDispatchName, serialize(action));
    });
  }
}
