import { MultiWinStoreProxy } from "../MultiWinStoreProxy";
import { Emitter } from "event-kit";

jest.useFakeTimers();

describe("StoreProxy", () => {
  test("should can proxy other methods", async () => {
    let storeDispatcher = {
      winId: "curWin",
      emitter: new Emitter(),
      handleDispatch: jest.fn(() => {
        return new Promise((resolve, reject) => {
          setTimeout(() => resolve("childWin"), 0);
        });
      }),
      handleDispatchNoReturn: jest.fn(),
      onDidWinMessage(callback: any) {
        storeDispatcher.emitter.on("did-message", callback);
      },
      sendMsg(senderId: string, data: any) {
        storeDispatcher.emitter.emit("did-message", { senderId, data });
      },
      sendWindowMessage: jest.fn(),
    };
    let newStore = new MultiWinStoreProxy(storeDispatcher, "helloStore");

    newStore.hello("hello");
    expect(storeDispatcher.handleDispatch).toHaveBeenLastCalledWith({
      store: "helloStore",
      method: "hello",
      args: ["hello"],
    });

    let childProxy = newStore.createWin("/hello", "winId2", { x: 10, y: 10 });
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
