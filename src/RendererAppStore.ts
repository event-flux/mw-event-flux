import { AppStore, AnyStoreDeclarer, DispatchItem, StoreBaseConstructor, declareStore, StoreBase } from "event-flux";
import { IRendererClientCallback, IRendererClient } from "./rendererClientTypes";
import { IWinProps, IOutStoreDeclarer } from "./mainClientTypes";
import { renderRegisterName } from "./constants";
import BrowserRendererClient from "./browser/BrowserRendererClient";

class IDGenerator {
  count = 0;

  genID() {
    return ++this.count;
  }

  dispose(id: number) {}
}

declare global {
  interface Window {
    eventFluxWin: IWinProps;
    winId: string;
  }
}

class StoreProxy implements DispatchItem {
  _refCount = 0;
  _stateKey: string | undefined;

  _init() {}

  _inject(
    StoreBuilder: StoreBaseConstructor<any>,
    stateKey?: string,
    depStores?: {
      [storeKey: string]: DispatchItem;
    },
    initState?: any,
    options?: any
  ): void {}

  dispose(): void {}

  _addRef(): void {
    this._refCount += 1;
  }
  _decreaseRef() {
    this._refCount -= 1;
  }
  getRefCount(): number {
    return this._refCount;
  }
}

export function getQuery() {
  let query: { [key: string]: string } = {};
  window.location.search
    .slice(1)
    .split("&")
    .forEach(item => {
      let [key, val] = item.split("=");
      query[key] = decodeURIComponent(val);
    });
  return query;
}

export default class RendererAppStore extends AppStore implements IRendererClientCallback {
  rendererClient: IRendererClient;

  constructor(storeDeclarers?: AnyStoreDeclarer[] | { [key: string]: any }, initStates?: any) {
    super();

    if (!Array.isArray(storeDeclarers)) {
      initStates = storeDeclarers;
      storeDeclarers = [];
    }

    this.rendererClient = new BrowserRendererClient(this);
    this.rendererClient.sendMainMsg(renderRegisterName, window.winId);

    let { storeDeclarers: mainDeclarersStr, state, winId: clientId, ...winProps } = this.rendererClient.getQuery();
    if (typeof window === "object") {
      window.eventFluxWin = winProps as IWinProps;
      window.winId = clientId;
    }
    let mainDeclarers = JSON.parse(mainDeclarersStr) as IOutStoreDeclarer[];

    for (let storeDeclarer of mainDeclarers) {
      storeDeclarers.push(
        declareStore((StoreProxy as any) as StoreBaseConstructor<any>, storeDeclarer.depStoreNames, {
          stateKey: storeDeclarer.stateKey,
          storeKey: storeDeclarer.storeKey,
          forMain: true,
        })
      );
    }

    this.registerStore(...storeDeclarers);

    initStates = initStates ? { ...initStates, ...JSON.parse(state) } : JSON.parse(state);
    if (initStates) {
      this.__initStates__ = initStates;
      this.state = initStates;
    }
  }

  handleDispatchReturn(data: any): void {}

  handleInvokeReturn(invokeId: string, error: any, data: any): void {}

  handleMessage(data: any): void {}

  handleWinMessage(senderId: string, data: any): void {}

  /**
   * Find the storeKey's dependencies that will need create in main process.
   * @param storeKey
   */
  findMainDepList(storeKey: string) {
    let depList = [storeKey];
    let mainDepList = [];

    for (let i = 0; i < depList.length; i += 1) {
      let curStoreKey = depList[i];
      let storeInfo = this._storeRegisterMap[curStoreKey];
      if (!storeInfo) {
        console.error(`The request store ${curStoreKey} is not registered!`);
        continue;
      }
      if (storeInfo.options!.forMain) {
        mainDepList.push(curStoreKey);
        continue;
      }
      let depNames = storeInfo.depStoreNames || [];
      depList.splice(depList.length, 0, ...depNames);
    }
    return mainDepList;
  }

  requestStore(storeKey: string): DispatchItem {
    let store = this.stores[storeKey];
    if (!store) {
      let mainDepList = this.findMainDepList(storeKey);
    }
    return super.requestStore(storeKey);
  }
}
