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
  renderDispatchNoReturnName,
  renderMapRequestStoreName,
  renderMapReleaseStoreName,
  renderDispatchObserve,
  renderDispatchDispose,
} from "./constants";
import RendererClient from "./RendererClient";
import { StoreProxy, StoreProxyDeclarer } from "./storeProxy/StoreProxy";
import objectMerge from "./utils/objectMerge";
import { IStoreDispatcher, IDispatchInfo } from "./storeProxy/DispatchItemProxy";
import { StoreListProxyDeclarer } from "./storeProxy/StoreListProxy";
import { StoreMapProxyDeclarer } from "./storeProxy/StoreMapProxy";
import { Emitter } from "event-kit";
import WindowProxy from "./WindowProxy";

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
    parentId?: string;
    parentWin: WindowProxy;
  }
}

export default class RendererAppStore extends AppStore implements IRendererClientCallback, IStoreDispatcher {
  rendererClient: IRendererClient;
  idGenerator = new IDGenerator();
  resolveMap: { [invokeId: string]: { resolve: (data: any) => void; reject: (err: any) => void } } = {};
  mainInvokeMap: { [invokeId: string]: (...args: any[]) => void } = {};

  winId: string;
  emitter = new Emitter();

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
      window.parentId = winProps.parentId;
      window.parentWin = new WindowProxy(this, winProps.parentId);
    }
    this.winId = clientId;
    this.rendererClient.sendMainMsg(renderRegisterName, clientId);

    let mainDeclarers = JSON.parse(mainDeclarersStr) as IOutStoreDeclarer[];

    for (let storeDeclarer of mainDeclarers) {
      let ProxyDeclarer: any;
      switch (storeDeclarer.storeType) {
        case "Item":
          ProxyDeclarer = StoreProxyDeclarer;
          break;
        case "List":
          ProxyDeclarer = StoreListProxyDeclarer;
          break;
        case "Map":
          ProxyDeclarer = StoreMapProxyDeclarer;
          break;
        default:
          ProxyDeclarer = StoreProxyDeclarer;
      }
      storeDeclarers.push(
        new ProxyDeclarer((StoreProxy as any) as StoreBaseConstructor<any>, storeDeclarer.depStoreNames, {
          stateKey: storeDeclarer.stateKey,
          storeKey: storeDeclarer.storeKey,
          forMain: true,
          _evs: storeDeclarer._evs,
          _invokers: storeDeclarer._invokers,
          _mapEvs: storeDeclarer._mapEvs,
          _mapInvokers: storeDeclarer._mapInvokers,
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

  handleDispatchReturn(actionStr: any): void {
    const { updated, deleted } = JSON.parse(actionStr);
    this.state = objectMerge(this.state, updated, deleted);
    this.batchUpdater.requestUpdate();
  }

  handleInvokeReturn(invokeId: string, error: any, result: any): void {
    // this.idGenerator.dispose(invokeId);
    let { resolve, reject } = this.resolveMap[invokeId];
    delete this.resolveMap[invokeId];
    if (error) {
      return reject(error);
    }
    if (result !== undefined) {
      result = JSON.parse(result);
    }
    resolve(result);
  }

  handleMainInvoke(invokeId: string, args: any[]): void {
    let callback = this.mainInvokeMap[invokeId];
    callback && callback(...args);
  }

  // When renderer process receive message
  handleMessage(data: any): void {
    this.emitter.emit("did-message", data);
  }

  // When renderer process receive win message
  handleWinMessage(senderId: string, data: any): void {
    this.emitter.emit("did-win-message", { senderId, data });
  }

  // When renderer process receive init message
  handleInit(data: IWinProps): void {
    if (typeof window === "object") {
      window.eventFluxWin = {
        ...window.eventFluxWin,
        ...data,
      };
      if (window.parentId) {
        window.parentId = window.parentId;
        window.parentWin.changeWinId(window.parentId);
      }
      this.emitter.emit("did-init", window.eventFluxWin);
    }
  }

  onDidMessage(callback: (data: any) => void) {
    return this.emitter.on("did-message", callback);
  }

  onDidWinMessage(callback: (params: { senderId: string; data: any }) => void) {
    return this.emitter.on("did-win-message", callback);
  }

  onDidInit(callback: (params: any) => void) {
    return this.emitter.on("did-init", callback);
  }

  handleMainRequestStores(storeNames: string[]) {
    this.rendererClient.sendMainMsg(renderRequestStoreName, this.winId, storeNames);
  }

  handleMainReleaseStores(storeNames: string[]) {
    this.rendererClient.sendMainMsg(renderReleaseStoreName, this.winId, storeNames);
  }

  handleMainMapRequestStores(storeName: string, mapKeys: string[]) {
    this.rendererClient.sendMainMsg(renderMapRequestStoreName, this.winId, storeName, mapKeys);
  }

  handleMainMapReleaseStores(storeName: string, mapKeys: string[]) {
    this.rendererClient.sendMainMsg(renderMapReleaseStoreName, this.winId, storeName, mapKeys);
  }

  sendMessage(args: any) {
    this.rendererClient.sendMainMsg(messageName, args);
  }

  sendWindowMessage(sourceId: string, targetId: string, data: any) {
    this.rendererClient.sendMainMsg(winMessageName, sourceId, targetId, data);
  }

  handleDispatch(dispatchInfo: IDispatchInfo) {
    let invokeId = this.idGenerator.genID();
    this.rendererClient.sendMainMsg(renderDispatchName, this.winId, invokeId, JSON.stringify(dispatchInfo));
    return new Promise(
      (thisResolve, thisReject) => (this.resolveMap[invokeId] = { resolve: thisResolve, reject: thisReject })
    );
  }

  handleDispatchNoReturn(dispatchInfo: IDispatchInfo) {
    this.rendererClient.sendMainMsg(renderDispatchNoReturnName, this.winId, JSON.stringify(dispatchInfo));
  }

  handleDispatchDisposable(dispatchInfo: IDispatchInfo, callback: (...args: any[]) => void) {
    let invokeId = this.idGenerator.genID();
    this.mainInvokeMap[invokeId] = callback;
    this.rendererClient.sendMainMsg(renderDispatchObserve, this.winId, invokeId, dispatchInfo);
    return {
      dispose: () => {
        this.rendererClient.sendMainMsg(renderDispatchDispose, this.winId, invokeId);
        delete this.mainInvokeMap[invokeId];
      },
    };
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
