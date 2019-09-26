import { AppStore, AnyStoreDeclarer, DispatchItem } from "event-flux";
import { IRendererClientCallback } from "./rendererClientTypes";
import { IWinProps, IOutStoreDeclarer } from "./mainClientTypes";

class IDGenerator {
  count = 0;

  genID() {
    return ++this.count;
  }

  dispose(id: number) {}
}

declare var eventFluxWin: IWinProps;
declare var winId: string;

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

class RendererAppStore extends AppStore implements IRendererClientCallback {
  mainStoreDeclarers: IOutStoreDeclarer[];

  constructor(storeDeclarers?: AnyStoreDeclarer[] | { [key: string]: any }, initStates?: any) {
    super(storeDeclarers, initStates);

    let { storeDeclarers: mainDeclarers, state, winId: clientId, ...winProps } = getQuery();
    eventFluxWin = winProps as IWinProps;
    winId = clientId;
    this.mainStoreDeclarers = JSON.parse(mainDeclarers);
    this.state = state;
  }

  handleDispatchReturn(data: any): void {}

  handleInvokeReturn(invokeId: string, error: any, data: any): void {}

  handleMessage(data: any): void {}

  handleWinMessage(senderId: string, data: any): void {}

  requestStore(storeKey: string): DispatchItem {}
}
