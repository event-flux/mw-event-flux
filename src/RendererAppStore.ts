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
import { serialize, deserialize } from "json-immutable-bn";

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

export interface IAppStoreOptions {
  serializer: (value: any) => string;
  deserializer: (str: string) => any;
  RendererClient?: IRendererClient;
}

export default class RendererAppStore extends AppStore implements IRendererClientCallback, IStoreDispatcher {
  rendererClient: IRendererClient;
  idGenerator = new IDGenerator();
  resolveMap: { [invokeId: string]: { resolve: (data: any) => void; reject: (err: any) => void } } = {};
  mainInvokeMap: { [invokeId: string]: (...args: any[]) => void } = {};

  winId: string;
  emitter = new Emitter();

  serializer: (value: any) => string;
  deserializer: (str: string) => any;

  constructor(storeDeclarers?: AnyStoreDeclarer[], options?: IAppStoreOptions) {
    super();

    if (!storeDeclarers) {
      storeDeclarers = [];
    }

    this.serializer = (options && options.serializer) || serialize;
    this.deserializer = (options && options.deserializer) || deserialize;

    let ClientClass = (options && options!.RendererClient) || RendererClient;
    this.rendererClient = new ClientClass(this);

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

    let initStates = this.deserializer(state);
    if (initStates) {
      this.__initStates__ = initStates;
      this.state = initStates;
    }
  }

  handleDispatchReturn(actionStr: any): void {
    const { updated, deleted } = this.deserializer(actionStr);
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
      result = this.deserializer(result);
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
      let { storeDeclarers, state, winId, ...winProps } = data;
      window.eventFluxWin = {
        ...window.eventFluxWin,
        ...winProps,
      };
      if (winProps.parentId) {
        window.parentId = winProps.parentId;
        window.parentWin.changeWinId(winProps.parentId);
      }
      if (state) {
        this.state = { ...this.state, ...state };
        this._sendUpdate();
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

  sendWindowMessage(sourceId: string, targetId: string, data: any) {
    this.rendererClient.sendMainMsg(winMessageName, sourceId, targetId, data);
  }

  handleDispatch(dispatchInfo: IDispatchInfo) {
    let invokeId = this.idGenerator.genID();
    this.rendererClient.sendMainMsg(renderDispatchName, this.winId, invokeId, this.serializer(dispatchInfo));
    return new Promise(
      (thisResolve, thisReject) => (this.resolveMap[invokeId] = { resolve: thisResolve, reject: thisReject })
    );
  }

  handleDispatchNoReturn(dispatchInfo: IDispatchInfo) {
    this.rendererClient.sendMainMsg(renderDispatchNoReturnName, this.winId, this.serializer(dispatchInfo));
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
