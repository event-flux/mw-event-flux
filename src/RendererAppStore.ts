import { AppStore, AnyStoreDeclarer, DispatchItem, StoreBaseConstructor, declareStore, StoreBase } from "event-flux";
import { IRendererClientCallback, IRendererClient } from "./rendererClientTypes";
import { IWinProps, IOutStoreDeclarer } from "./mainClientTypes";
import {
  renderRegisterName,
  renderRequestStoreName,
  renderReleaseStoreName,
  messageName,
  winMessageName,
  renderDispatchName,
} from "./constants";
import RendererClient from "./RendererClient";
import { StoreProxy } from "./StoreProxy";

class IDGenerator {
  count = 0;

  genID() {
    return ++this.count;
  }
}

declare global {
  interface Window {
    eventFluxWin: IWinProps;
    winId: string;
  }
}

export default class RendererAppStore extends AppStore implements IRendererClientCallback {
  rendererClient: IRendererClient;
  idGenerator = new IDGenerator();
  resolveMap: { [invokeId: string]: { resolve: (data: any) => void; reject: (err: any) => void } } = {};

  constructor(storeDeclarers?: AnyStoreDeclarer[] | { [key: string]: any }, initStates?: any) {
    super();

    if (!Array.isArray(storeDeclarers)) {
      initStates = storeDeclarers;
      storeDeclarers = [];
    }

    this.rendererClient = new RendererClient(this);

    let { storeDeclarers: mainDeclarersStr, state, winId: clientId, ...winProps } = this.rendererClient.getQuery();
    if (typeof window === "object") {
      window.eventFluxWin = winProps as IWinProps;
      window.winId = clientId;
    }
    this.rendererClient.sendMainMsg(renderRegisterName, window.winId);

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

  handleInit(data: any): void {}

  handleMainRequestStores(storeNames: string[]) {
    this.rendererClient.sendMainMsg(renderRequestStoreName, storeNames);
  }

  handleMainReleaseStores(storeNames: string[]) {
    this.rendererClient.sendMainMsg(renderReleaseStoreName, storeNames);
  }

  sendMessage(args: any) {
    this.rendererClient.sendMainMsg(messageName, args);
  }

  sendWindowMessage(sourceId: string, targetId: string, data: any) {
    this.rendererClient.sendMainMsg(winMessageName, sourceId, targetId, data);
  }

  handleDispatch(storeKey: string, property: string, args: any[]) {
    let invokeId = this.idGenerator.genID();
    let storeAction = { store: storeKey, method: property, args };
    this.rendererClient.sendMainMsg(renderDispatchName, window.winId, invokeId, storeAction);
    return new Promise(
      (thisResolve, thisReject) => (this.resolveMap[invokeId] = { resolve: thisResolve, reject: thisReject })
    );
  }

  /**
   * Find the storeKey's dependencies that will need create in main process.
   * @param storeKey
   */
  findMainDepList(storeKey: string): string[] {
    let depList = [storeKey];
    let mainDepList = new Set<string>();

    for (let i = 0; i < depList.length; i += 1) {
      let curStoreKey = depList[i];
      let storeInfo = this._storeRegisterMap[curStoreKey];
      if (!storeInfo) {
        console.error(`The request store ${curStoreKey} is not registered!`);
        continue;
      }
      if (storeInfo.options!.forMain && !mainDepList.has(curStoreKey)) {
        mainDepList.add(curStoreKey);
        continue;
      }
      let depNames = storeInfo.depStoreNames || [];
      depList.splice(depList.length, 0, ...depNames);
    }
    return Array.from(mainDepList);
  }

  _createStoreAndInject(storeKey: string) {
    let mainDepList = this.findMainDepList(storeKey);
    if (mainDepList.length > 0) {
      this.handleMainRequestStores(mainDepList);
    }
    return super._createStoreAndInject(storeKey);
  }

  _disposeStoreAndDeps(storeKey: string, store: DispatchItem) {
    let mainDepList = this.findMainDepList(storeKey);
    if (mainDepList.length > 0) {
      this.handleMainReleaseStores(mainDepList);
    }
    return super._disposeStoreAndDeps(storeKey, store);
  }
}
