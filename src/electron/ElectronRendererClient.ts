import {
  mainInitName,
  renderRegisterName,
  renderDispatchName,
  mainDispatchName,
  mainReturnName,
  winMessageName,
  messageName,
} from "../constants";
import { ipcRenderer, remote } from "electron";
import {
  IStoreCallback,
  IActionCallback,
  IResultCallback,
  IMessageCallback,
  IWinMessageCallback,
  IInitWindowCallback,
} from "../IRendererClient";
import { Log, Logger } from "../utils/loggerApply";

export default class ElectronRendererClient {
  clientId: any;

  constructor(
    callback: IStoreCallback,
    onGetAction: IActionCallback,
    onGetResult: IResultCallback,
    onGetMessage: IMessageCallback,
    onGetWinMessage: IWinMessageCallback,
    onInitWindow: IInitWindowCallback,
    log: Log
  ) {
    let clientId = (window as any).clientId;
    if (!clientId) {
      const rendererId = (process as any).guestInstanceId || remote.getCurrentWindow().id;
      clientId = (process as any).guestInstanceId ? `webview ${rendererId}` : `window ${rendererId}`;
    }
    this.clientId = clientId;

    // Allows the main process to forward updates to this renderer automatically
    log((logger: Logger) => logger("ElectronRendererClient", "start register self", clientId));
    ipcRenderer.send(renderRegisterName, { clientId });

    // Dispatches from other processes are forwarded using this ipc message
    ipcRenderer.on(mainInitName, (event: Event, storeFilters: any, stateData: any) => {
      log((logger: Logger) => logger("ElectronRendererClient", "get main init message"));
      callback(stateData, storeFilters);
    });
    ipcRenderer.on(mainDispatchName, (event: Event, stringifiedAction: string) => {
      onGetAction(stringifiedAction);
    });
    ipcRenderer.on(mainReturnName, (event: Event, invokeId: number, error: Error, result: any) => {
      onGetResult(invokeId, error, result);
    });
    ipcRenderer.on(messageName, (event: Event, params: any) => {
      onGetMessage(params);
    });
    ipcRenderer.on(winMessageName, (event: Event, senderId: string, params: any) => {
      onGetWinMessage(senderId, params);
    });

    ipcRenderer.on("__INIT_WINDOW__", (event: Event, params: any) => {
      onInitWindow(params);
    });
  }

  // Forward update to the main process so that it can forward the update to all other renderers
  forward(invokeId: string, action: any) {
    ipcRenderer.send(renderDispatchName, this.clientId, invokeId, action);
  }

  sendMessage(args: any) {
    ipcRenderer.send(messageName, args);
  }

  sendWindowMessage(clientId: string, args: any) {
    ipcRenderer.send(winMessageName, clientId, args);
  }
}
