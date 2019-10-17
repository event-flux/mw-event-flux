import RendererAppStore from "./RendererAppStore";
import { Emitter } from "event-kit";

export default class WindowProxy {
  store: RendererAppStore;
  winId: string | null;
  emitter = new Emitter();

  constructor(store: RendererAppStore, winId: string | null) {
    this.store = store;
    this.winId = winId;

    this.store.onDidWinMessage(this.handleWinMessage.bind(this));
  }

  changeWinId(winId: string) {
    this.winId = winId;
  }

  send(message: any) {
    if (this.winId) {
      this.store.sendWindowMessage(this.store.winId, this.winId, message);
    }
  }

  handleWinMessage({ senderId, data }: { senderId: string; data: any }) {
    if (senderId === this.winId) {
      this.emitter.emit("message", data);
    }
  }

  onDidReceiveMsg(callback: (message: any) => void) {
    return this.emitter.on("message", callback);
  }
}
