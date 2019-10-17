import { StoreBase, DispatchParent, StoreList } from "event-flux";
import WindowProxy from "../WindowProxy";
import RendererAppStore from "../RendererAppStore";
import { Emitter } from "event-kit";

jest.useFakeTimers();

describe("WindowProxy", () => {
  test("should send and receive messages from winId", () => {
    class MyAppStore {
      winId = "win1";
      emitter = new Emitter();
      sendWindowMessage = jest.fn();

      onDidWinMessage(callback: (params: { senderId: string; data: any }) => void) {
        this.emitter.on("did-message", callback);
      }

      sendMsg(data: any) {
        this.emitter.emit("did-message", data);
      }
    }
    let windowProxy = new WindowProxy((new MyAppStore() as unknown) as RendererAppStore, null);
    windowProxy.send("hello");
    expect(windowProxy.store.sendWindowMessage).not.toHaveBeenCalled();

    windowProxy.changeWinId("proxyWin");
    windowProxy.send("hello");
    expect(windowProxy.store.sendWindowMessage).toHaveBeenCalledWith("win1", "proxyWin", "hello");

    let observer = jest.fn();
    windowProxy.onDidReceiveMsg(observer);
    ((windowProxy.store as unknown) as MyAppStore).sendMsg({ senderId: "proxyWin", data: "world" });
    expect(observer).toHaveBeenCalledWith("world");
  });
});
