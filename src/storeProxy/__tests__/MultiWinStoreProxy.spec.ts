import { MultiWinStoreProxy } from "../MultiWinStoreProxy";
import { Emitter } from "event-kit";
import { IStoreDispatcher } from "../DispatchItemProxy";

jest.useFakeTimers();

describe("StoreProxy", () => {
  let originWinId: string;

  beforeEach(() => {
    originWinId = window.winId;
    window.winId = "winId2";
  });

  afterEach(() => {
    window.winId = originWinId;
  });

  test("should can proxy other methods", async () => {
    class StoreDispatcher implements IStoreDispatcher {
      winId = "curWin";
      emitter = new Emitter();
      handleDispatch = jest.fn(() => {
        return new Promise((resolve, reject) => {
          setTimeout(() => resolve("childWin"), 0);
        });
      });

      handleDispatchNoReturn = jest.fn();
      handleDispatchDisposable = jest.fn();
      sendWindowMessage = jest.fn();

      onDidWinMessage(callback: any) {
        this.emitter.on("did-message", callback);
      }
      sendMsg(senderId: string, data: any) {
        this.emitter.emit("did-message", { senderId, data });
      }
    }

    let storeDispatcher = new StoreDispatcher();
    let newStore = new MultiWinStoreProxy(storeDispatcher, "helloStore", [], []);

    newStore.hello("hello");
    expect(storeDispatcher.handleDispatchNoReturn).toHaveBeenLastCalledWith({
      store: "helloStore",
      method: "hello",
      args: ["hello"],
    });

    let childProxy = newStore.createWin("/hello", { x: 10, y: 10 });
    expect(storeDispatcher.handleDispatch).toHaveBeenLastCalledWith({
      store: "helloStore",
      method: "createWin",
      args: ["/hello", "winId2", { x: 10, y: 10 }],
    });

    childProxy.send("hello");
    expect(childProxy.messages).toEqual(["hello"]);

    // Make the create dispatch task run
    let dispatchRes = storeDispatcher.handleDispatch();
    jest.runAllTimers();
    await dispatchRes;

    expect(storeDispatcher.sendWindowMessage).toHaveBeenCalledWith("curWin", "childWin", "hello");
    expect(childProxy.messages).toEqual([]);

    childProxy.send("world");
    expect(storeDispatcher.sendWindowMessage).toHaveBeenCalledWith("curWin", "childWin", "world");

    let observer = jest.fn();
    childProxy.onDidReceiveMsg(observer);
    storeDispatcher.sendMsg("childWin", "children");
    expect(observer).toHaveBeenCalledWith("children");
  });
});
