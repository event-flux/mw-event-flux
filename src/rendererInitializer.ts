import buildRendererAppStore, { RendererAppStore } from "./RendererAppStore2";
import { Emitter } from "event-kit";
import IExtendStoreBase from "./IExtendStoreBase";
import IStoresDeclarer, { IStoresObjDeclarer } from "./IStoresDeclarer";
import { Logger } from "./utils/loggerApply";

function getQuery() {
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

class ChildWindowProxy {
  emitter = new Emitter();
  store: RendererAppStore;
  messages: any[] = [];
  childId: any;

  constructor(store: RendererAppStore, createPromise: Promise<string>) {
    this.emitter = new Emitter();
    this.store = store;
    this.messages = [];
    createPromise.then(childId => {
      this.childId = childId;
      this.messages.forEach(message => {
        this.send(message);
      });
    });
    (this.store as any).onDidWinMessage(this.handleWinMessage.bind(this));
  }

  send(message: any) {
    if (!this.childId) {
      this.messages.push(message);
    } else {
      (this.store as any).sendWindowMessage(this.childId, message);
    }
  }

  handleWinMessage({ senderId, message }: { senderId: string; message: string }) {
    if (senderId === this.childId) {
      this.emitter.emit("message", message);
    }
  }

  onDidReceiveMsg(callback: (message: any) => void) {
    return this.emitter.on("message", callback);
  }
}

class ParentWindowProxy {
  store: RendererAppStore;
  parentId: string;
  emitter: Emitter;

  constructor(store: RendererAppStore, parentId: string) {
    this.store = store;
    this.parentId = parentId;
    this.emitter = new Emitter();

    this.store.onDidWinMessage(this.handleWinMessage.bind(this));
  }

  send(message: any) {
    this.store.sendWindowMessage(this.parentId, message);
  }

  handleWinMessage({ senderId, message }: { senderId: string; message: any }) {
    if (senderId === this.parentId) {
      this.emitter.emit("message", message);
    }
  }

  onDidReceiveMsg(callback: (message: any) => void) {
    return this.emitter.on("message", callback);
  }
}

interface RenderOptions {
  renderHandler?: any;
  actionHandler?: any;
}

export default function rendererInit(rendererStores: IStoresObjDeclarer, options: RenderOptions = {}, logger: Logger) {
  let query = getQuery();
  (window as any).clientId = query.clientId || "mainClient";
  (window as any).parentId = query.parentId;

  // if (!window['clientId']) {  // Not a renderer window
  //   return;
  // }
  function getAction() {
    if ((window as any).process) {
      return query.url || "/";
    }
    return window.location.pathname + window.location.search + window.location.hash;
  }
  (window as any).action = getAction();

  const store = buildRendererAppStore(rendererStores, options.renderHandler, logger);

  const genProxy = (appStore: RendererAppStore, multiWinStore: IExtendStoreBase) => {
    return new Proxy(multiWinStore, {
      get(target: any, propName: string) {
        if (!propName) {
          return;
        }
        if (propName === "createWin") {
          return (url: string, params: any) => {
            return new ChildWindowProxy(appStore, target[propName](url, (window as any).clientId, params));
          };
        } else {
          return target[propName];
        }
      },
    });
  };

  logger("rendererInitializer", "start async init", query);
  return store.asyncInit().then(state => {
    store.stores.multiWinStore = genProxy(store, store.stores.multiWinStore);
    if ((window as any).parentId) {
      (window as any).parentWin = new ParentWindowProxy(store, (window as any).parentId);
    }
    store.observeInitWindow(message => {
      // console.log('message', message);
      let { url, parentId } = message;
      // change-props
      (window as any).action = url;
      (window as any).parentId = parentId;
      if (!(window as any).parentWin) {
        (window as any).parentWin = new ParentWindowProxy(store, (window as any).parentId);
      } else {
        (window as any).parentWin.parentId = parentId;
      }
      options.actionHandler && options.actionHandler((window as any).action, (window as any).parentWin);
    });
    return store;
  });
}
