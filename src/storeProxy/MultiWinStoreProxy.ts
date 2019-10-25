import DispatchItemProxy, { IStoreDispatcher } from "./DispatchItemProxy";
import { StoreProxy, proxyStore } from "./StoreProxy";
import { IWinProps, IWinParams } from "../mainClientTypes";
import RendererAppStore from "../RendererAppStore";
import { Emitter } from "event-kit";

export class ChildWindowProxy {
  emitter = new Emitter();
  store: RendererAppStore;
  messages: any[] = [];
  childId: any;

  constructor(store: RendererAppStore, createPromise: Promise<string>) {
    this.store = store;
    this.messages = [];
    createPromise.then(childId => {
      this.childId = childId;
      this.messages.forEach(message => {
        this.send(message);
      });
      this.messages = [];
    });
    this.store.onDidWinMessage(this.handleWinMessage.bind(this));
  }

  send(message: any) {
    if (!this.childId) {
      this.messages.push(message);
    } else {
      this.store.sendWindowMessage(this.store.winId, this.childId, message);
    }
  }

  handleWinMessage({ senderId, data }: { senderId: string; data: string }) {
    if (senderId === this.childId) {
      this.emitter.emit("message", data);
    }
  }

  onDidReceiveMsg(callback: (message: any) => void) {
    return this.emitter.on("message", callback);
  }
}

export class MultiWinStoreProxy extends DispatchItemProxy {
  appStore: RendererAppStore;
  storeKey: string;
  evs: Set<string>;
  invokers: Set<string> = new Set<string>();

  constructor(appStore: IStoreDispatcher, storeKey: string, evs: string[], invokers: string[]) {
    super();

    this.appStore = appStore as RendererAppStore;
    this.storeKey = storeKey;
    this.evs = new Set<string>(evs);
    this.invokers = new Set<string>(invokers);

    return proxyStore(appStore, this, storeKey);
  }

  createWin(url: IWinProps | string, params: IWinParams): ChildWindowProxy {
    let parentId = window.winId;
    let winProps: IWinProps = typeof url === "string" ? { path: url } : url;
    winProps.parentId = parentId;

    let result = this.appStore.handleDispatch({
      store: this.storeKey,
      method: "createWin",
      args: [winProps, params],
    }) as Promise<string>;
    return new ChildWindowProxy(this.appStore, result);
  }

  createOrOpenWin(winName: string, url: string | IWinProps, params: IWinParams): ChildWindowProxy {
    let parentId = window.winId;
    let winProps: IWinProps = typeof url === "string" ? { path: url } : url;
    winProps.parentId = parentId;

    let result = this.appStore.handleDispatch({
      store: this.storeKey,
      method: "createOrOpenWin",
      args: [winName, winProps, params],
    }) as Promise<string>;
    return new ChildWindowProxy(this.appStore, result);
  }
}
