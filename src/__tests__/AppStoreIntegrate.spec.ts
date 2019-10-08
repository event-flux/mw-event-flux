import MainAppStore from "../MainAppStore";
import { declareStore, StoreBase, RecycleStrategy, AnyStoreDeclarer, AppStore, DispatchParent } from "event-flux";
import { IMainClient, IWinInfo, IMainClientCallback } from "../mainClientTypes";
import { mainDispatchName, mainReturnName, renderRegisterName } from "../constants";
import { declareWinStore } from "../StoreDeclarer";
import { IRendererClient, IRendererClientCallback } from "../rendererClientTypes";
import MultiWinSaver from "../MultiWinSaver";
import RendererAppStore from "../RendererAppStore";
import RendererClient from "../RendererClient";

jest.mock("../MainClient", () => {
  class MyMainClient implements IMainClient {
    outChannel: { [winId: string]: any } = [];
    multiWinSaver: MultiWinSaver;
    mainClientCallback: IMainClientCallback;

    activeWin = jest.fn();
    createWin = jest.fn();
    changeWin = jest.fn();

    constructor(multiWinSaver: MultiWinSaver, callback: IMainClientCallback) {
      this.multiWinSaver = multiWinSaver;
      this.mainClientCallback = callback;

      this.multiWinSaver.addWin({
        winId: "mainClient",
        window: this,
      });
    }

    initChannel(inChannel: any[], outChannel: { [winId: string]: any }) {
      inChannel = new Proxy(inChannel, {
        get: (target: any[], property: string, receiver: any) => {
          if (property === "push") {
            return (elem: any) => {
              let BrowserMainClient = require("../browser/BrowserMainClient").default;
              BrowserMainClient.prototype._handleMessage.call(this, { data: { action: elem[0], data: elem[1] } });
              return Reflect.apply(target[property], target, [elem]);
            };
          }
          return Reflect.get(target, property, receiver);
        },
      });
      this.outChannel = outChannel;
      return [inChannel, outChannel];
    }

    sendWinMsg(winInfo: IWinInfo, msgName: string, ...args: any[]) {
      let winChannel = this.outChannel[winInfo.winId];
      if (!winChannel) {
        winChannel = this.outChannel[winInfo.winId] = [];
      }
      winChannel.push([msgName, args]);
    }
  }
  return { default: MyMainClient };
});

jest.mock("../RendererClient", () => {
  class MyRenderClient implements IRendererClient {
    msgChannel: any[] = [];
    rendererCallback: IRendererClientCallback;

    constructor(rendererCallback: IRendererClientCallback) {
      this.rendererCallback = rendererCallback;
    }

    initChannel(inChannels: { [winId: string]: any }, outChannel: any[]) {
      let query = this.getQuery();
      inChannels[query.winId] = new Proxy(inChannels[query.winId], {
        get: (target: any[], property: string, receiver: any) => {
          if (property === "push") {
            return (elem: any) => {
              let BrowserRendererClient = require("../browser/BrowserRendererClient").default;
              BrowserRendererClient.prototype._handleMessage.call(this, {
                data: { action: elem[0], data: elem[1] },
              } as MessageEvent);
              return Reflect.apply(target[property], target, [elem]);
            };
          }
          return Reflect.get(target, property, receiver);
        },
      });
      this.msgChannel = outChannel;
      return [inChannels, outChannel];
    }

    sendMainMsg(msgName: string, ...params: any[]) {
      this.msgChannel.push([msgName, params]);
    }

    getQuery() {
      return (window as any).query;
    }
  }
  return { default: MyRenderClient };
});

jest.useFakeTimers();

interface IWinChannels {
  [winId: string]: any[];
}

function initAppStore(
  mainStoreDeclares: AnyStoreDeclarer[],
  rendererStoreDeclares: AnyStoreDeclarer[]
): [MainAppStore, RendererAppStore] {
  let winChannels: IWinChannels = { mainClient: [] };
  let rendererChannel: any[] = [];

  let mainAppStore = new MainAppStore(mainStoreDeclares);
  [rendererChannel, winChannels] = (mainAppStore.mainClient as any).initChannel(rendererChannel, winChannels);
  mainAppStore.init();

  RendererClient.prototype.getQuery = () => ({
    storeDeclarers: mainAppStore.getStoreDeclarers(),
    state: mainAppStore.getInitStates("mainClient"),
    winId: "mainClient",
  });

  let rendererAppStore = new RendererAppStore(rendererStoreDeclares);
  [winChannels, rendererChannel] = (rendererAppStore.rendererClient as any).initChannel(winChannels, rendererChannel);
  rendererAppStore.rendererClient.sendMainMsg(renderRegisterName, "mainClient");
  rendererAppStore.init();
  return [mainAppStore, rendererAppStore];
}

class TodoStore extends StoreBase<{ hello: string }> {
  constructor(appStore: DispatchParent) {
    super(appStore);
    this.state = { hello: "hello1" };
  }

  reflect(arg: string) {
    this.setState({ hello: arg });
    return arg;
  }
}

describe("For AppStore integration, Main and Renderer app store", () => {
  test("should create and request stores", () => {
    let [mainAppStore, rendererAppStore] = initAppStore(
      [declareStore(TodoStore, [], { stateKey: "mainTodo", storeKey: "mainTodoStore" })],
      [declareStore(TodoStore, [], { stateKey: "todo", storeKey: "todoStore" })]
    );

    mainAppStore.setRecycleStrategy(RecycleStrategy.Urgent);
    rendererAppStore.setRecycleStrategy(RecycleStrategy.Urgent);

    expect(mainAppStore.multiWinSaver.registerIds).toEqual(new Set<string>(["mainClient"]));
    let mainTodoStore = rendererAppStore.requestStore("mainTodoStore");
    expect(Object.keys(mainAppStore.stores)).toEqual(["mainTodoStore"]);
    expect(Object.keys(rendererAppStore.stores)).toEqual(["mainTodoStore"]);

    rendererAppStore.releaseStore("mainTodoStore");
    expect(Object.keys(mainAppStore.stores)).toEqual([]);
    expect(Object.keys(rendererAppStore.stores)).toEqual([]);

    rendererAppStore.rendererClient.sendMainMsg("close", "mainClient");
    expect(mainAppStore.multiWinSaver.winInfos).toEqual([]);
  });

  test("should invoke normally", async () => {
    let [mainAppStore, rendererAppStore] = initAppStore(
      [declareStore(TodoStore, [], { stateKey: "mainTodo", storeKey: "mainTodoStore" })],
      [declareStore(TodoStore, [], { stateKey: "todo", storeKey: "todoStore" })]
    );
    let mainTodoStore = rendererAppStore.requestStore("mainTodoStore");
    expect(await (mainTodoStore as any).reflect("hello")).toBe("hello");

    let errorObj = null;
    try {
      await (mainTodoStore as any).notExists("hello");
    } catch (err) {
      errorObj = err;
    }
    expect(errorObj).toBeTruthy();
  });
});
