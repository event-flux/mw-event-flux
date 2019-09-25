import { AppStore } from 'event-flux';
import { 
  mainInitName, mainDispatchName, mainReturnName, renderDispatchName, renderRegisterName, messageName, winMessageName, initMessageName
} from './constants';
import IErrorObj from "./IErrorObj";
import MultiWinSaver, { IWinInfo } from "./MultiWinSaver";

interface IMainClient {
  sendWinMsg(winInfo: IWinInfo, msgName: string, ...args: any[]): void;
}

class MainWinProcessor {
  constructor(private multiWinSaver: MultiWinSaver, private mainClient: IMainClient) {
  }

  async _handleRendererPayload(payload: string): Promise<any> {
    
  }

  handleRendererDispatch(winId: string, invokeId: string, stringifiedAction: string) {
    let winInfo = this.multiWinSaver.getWinInfo(winId);
    if (!winInfo) return;
    this._handleRendererPayload(stringifiedAction).then(result => {
      this.mainClient.sendWinMsg(winInfo, mainReturnName, invokeId, undefined, result);
    }, err => {
      let errObj: IErrorObj | null = null;

      if (err) {
        errObj = { name: err.name, message: err.message } as IErrorObj;
        if (errObj) {
          Object.keys(err).forEach(key => errObj![key] = err[key]);
        }
      }
      
      this.mainClient.sendWinMsg(winInfo, mainReturnName, invokeId, errObj, undefined);

      if (process.env.NODE_ENV !== "production") {
        throw err;
      }
    });
  }

  handleWinMessage(senderId: string, targetId: string, data: any) {
    let winInfo = this.multiWinSaver.getWinInfo(targetId);
    if (!winInfo) return;
    this.multiWinSaver.whenRegister(winInfo.winId, () => {
      this.mainClient.sendWinMsg(winInfo, winMessageName, senderId, data);
    });
  }

  initWin(winId: string, params: any) {
    let winInfo = this.multiWinSaver.getWinInfo(winId);
    if (!winInfo) return;
    this.multiWinSaver.whenRegister(winInfo.winId, () => {
      this.mainClient.sendWinMsg(winInfo, initMessageName, params);
    });
  }
}

class MainAppStore extends AppStore {
  
}