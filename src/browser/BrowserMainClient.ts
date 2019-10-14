import { Log } from "../utils/loggerApply";
import {
  renderRegisterName,
  renderDispatchName,
  renderRequestStoreName,
  renderReleaseStoreName,
  winMessageName,
  renderDispatchNoReturnName,
  renderMapRequestStoreName,
  renderMapReleaseStoreName,
} from "../constants";
import { IWinInfo, IMainClient, IMainClientCallback, IWinProps, IWinParams } from "../mainClientTypes";
import MultiWinSaver from "../MultiWinSaver";
import { decodeQuery, encodeQuery } from "../utils/queryHandler";

function genBrowserUrl(url = "", winId: string, winProps: IWinProps) {
  let genUrl = new URL(url, location.href);
  genUrl.search =
    "?" +
    encodeQuery({
      ...decodeQuery(genUrl.search.slice(1)),
      ...winProps,
      winId,
      isSlave: 1,
    });
  return genUrl.toString();
}

export default class BrowserMainClient implements IMainClient {
  multiWinSaver: MultiWinSaver;
  mainClientCallback: IMainClientCallback;
  log: Log | undefined;

  constructor(multiWinSaver: MultiWinSaver, callback: IMainClientCallback, log?: Log) {
    this.multiWinSaver = multiWinSaver;
    this.mainClientCallback = callback;
    this.log = log;

    (window as any).isMainClient = true;

    window.addEventListener("message", this._handleMessage.bind(this));

    this.multiWinSaver.addWin({
      winId: "mainClient",
      window,
    });
  }

  sendWinMsg(winInfo: IWinInfo, msgName: string, ...args: any[]) {
    winInfo.window.postMessage({ action: msgName, data: args }, "*");
  }

  // closeAllWindows() {
  //   Object.keys(this.clients).forEach(clientId => {
  //     let window = this.clients[clientId];
  //     window && window.close();
  //   });
  // }

  activeWin(winInfo: IWinInfo) {}

  createWin(winId: string, winProps: IWinProps, winParams: IWinParams) {
    let featureStr = Object.keys(winParams)
      .map((key: string) => `${key}=${winParams[key]}`)
      .join(",");

    let childWin = window.open(
      genBrowserUrl(winProps.path, winId, winProps),
      "newwindow",
      featureStr + ", toolbar=no, menubar=no, scrollbars=no, resizable=no, location=no, status=no, titlebar=no"
    );
    if (childWin) {
      childWin.onbeforeunload = () => this.multiWinSaver.deleteWin(winId);
    }
    this.multiWinSaver.addWin({ winId, window: childWin });
    return childWin;
  }

  changeWin(winInfo: IWinInfo, winProps: IWinProps, winParams: IWinParams): void {}

  closeWin(winInfo: IWinInfo) {
    winInfo.window.close();
  }

  _handleMessage(event: MessageEvent) {
    let { action, data: payload } = event.data || ({} as any);
    switch (action) {
      case renderDispatchName: {
        let [clientId, invokeId, args] = payload;
        this.mainClientCallback.handleRendererDispatch(clientId, invokeId, args);
        break;
      }
      case renderDispatchNoReturnName: {
        let [clientId, args] = payload;
        this.mainClientCallback.handleRendererDispatchNoReturn(clientId, args);
        break;
      }
      case renderRequestStoreName: {
        let [clientId, storeKeys] = payload;
        this.mainClientCallback.handleRequestStores(clientId, storeKeys);
        break;
      }
      case renderReleaseStoreName: {
        let [clientId, storeKeys] = payload;
        this.mainClientCallback.handleReleaseStores(clientId, storeKeys);
        break;
      }
      case renderMapRequestStoreName: {
        let [clientId, storeKey, mapKeys] = payload;
        this.mainClientCallback.handleMapRequestStores(clientId, storeKey, mapKeys);
        break;
      }
      case renderMapReleaseStoreName: {
        let [clientId, storeKey, mapKeys] = payload;
        this.mainClientCallback.handleMapReleaseStores(clientId, storeKey, mapKeys);
        break;
      }
      case winMessageName: {
        let [senderId, clientId, data] = payload;
        this.mainClientCallback.handleWinMessage(senderId, clientId, data);
        break;
      }
      case "close": {
        // Child window has closed
        let [clientId] = payload;
        this.multiWinSaver.deleteWin(clientId);
        break;
      }
      case renderRegisterName: {
        let [clientId] = payload;
        this.multiWinSaver.registerWin(clientId);
        break;
      }
    }
  }
}
