import {
  renderDispatchName,
  renderRegisterName,
  mainDispatchName,
  mainInitName,
  mainReturnName,
  winMessageName,
  messageName,
} from "../constants";
import {
  IStoreCallback,
  IActionCallback,
  IResultCallback,
  IMessageCallback,
  IWinMessageCallback,
} from "../IRendererClient";

export default class BrowserRendererClient {
  clientId: any;

  constructor(
    callback: IStoreCallback,
    onGetAction: IActionCallback,
    onGetResult: IResultCallback,
    onGetMessage: IMessageCallback,
    onGetWinMessage: IWinMessageCallback
  ) {
    let clientId = (window as any).clientId || "mainClient";
    this.clientId = clientId;

    let mainWin = (window as any).isMainClient ? window : window.opener;
    mainWin.postMessage({ action: renderRegisterName, clientId, data: {} }, "*");
    window.addEventListener("message", event => {
      let { action, error, data, senderId, invokeId } = event.data || ({} as any);
      if (action === mainInitName) {
        callback(data[0], data[1]);
      } else if (action === mainDispatchName) {
        onGetAction(data);
      } else if (action === mainReturnName) {
        onGetResult(invokeId, error, data);
      } else if (action === messageName) {
        onGetMessage(data);
      } else if (action === winMessageName) {
        onGetWinMessage(senderId, data);
      }
    });
    window.addEventListener("unload", () => {
      mainWin.postMessage({ action: "close", clientId });
    });
  }

  // Forward update to the main process so that it can forward the update to all other renderers
  forward(invokeId: number, action: any) {
    let clientId = this.clientId;
    let mainWin = (window as any).isMainClient ? window : window.opener;
    mainWin.postMessage({ action: renderDispatchName, data: action, invokeId, clientId }, "*");
  }

  sendMessage(args: any) {
    let mainWin = (window as any).isMainClient ? window : window.opener;
    mainWin.postMessage({ action: messageName, data: args }, "*");
  }

  sendWindowMessage(clientId: string, args: any) {
    let mainWin = (window as any).isMainClient ? window : window.opener;
    let senderId = this.clientId;
    mainWin.postMessage({ action: winMessageName, senderId, clientId, data: args }, "*");
  }
}
