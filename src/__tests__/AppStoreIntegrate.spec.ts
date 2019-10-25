import MainAppStore from "../MainAppStore";
import {
  declareStore,
  StoreBase,
  RecycleStrategy,
  AnyStoreDeclarer,
  AppStore,
  DispatchParent,
  declareStoreMap,
  declareStoreList,
  invoker,
  eventListener,
} from "event-flux";
import { IMainClient, IWinInfo, IMainClientCallback } from "../mainClientTypes";
import { mainDispatchName, mainReturnName, renderRegisterName } from "../constants";
import { declareWinStore } from "../StoreDeclarer";
import { IRendererClient, IRendererClientCallback } from "../rendererClientTypes";
import MultiWinSaver from "../MultiWinSaver";
import RendererAppStore from "../RendererAppStore";
import RendererClient from "../RendererClient";
import immutable from "immutable";

jest.mock("../MainClient", () => {
  class MyMainClient implements IMainClient {
    outChannel: { [winId: string]: any } = [];
    multiWinSaver: MultiWinSaver;
    mainClientCallback: IMainClientCallback;

    activeWin = jest.fn();
    createWin = jest.fn();
    changeWin = jest.fn();
    closeWin = jest.fn();

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
  return MyMainClient;
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
  return MyRenderClient;
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

  @invoker
  retReflect(arg: string) {
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
    expect(await (mainTodoStore as any).retReflect("hello")).toBe("hello");

    // let errorObj = null;
    // try {
    //   await (mainTodoStore as any).notExists("hello");
    // } catch (err) {
    //   errorObj = err;
    // }
    // expect(errorObj).toBeTruthy();
  });

  test("should sync messages", async () => {
    let [mainAppStore, rendererAppStore] = initAppStore(
      [declareStore(TodoStore, [], { stateKey: "mainTodo", storeKey: "mainTodoStore" })],
      [declareStore(TodoStore, [], { stateKey: "todo", storeKey: "todoStore" })]
    );
    mainAppStore.setRecycleStrategy(RecycleStrategy.Urgent);
    rendererAppStore.setRecycleStrategy(RecycleStrategy.Urgent);

    expect(rendererAppStore.state).toEqual({});
    let mainTodoStore = rendererAppStore.requestStore("mainTodoStore");

    jest.runAllTimers();
    expect(rendererAppStore.state).toEqual({ mainTodo: { hello: "hello1" } });

    expect(await (mainTodoStore as any).retReflect("hello")).toBe("hello");
    jest.runAllTimers();

    expect(rendererAppStore.state).toEqual({ mainTodo: { hello: "hello" } });

    rendererAppStore.releaseStore("mainTodoStore");
    jest.runAllTimers();
    expect(rendererAppStore.state).toEqual({ mainTodo: undefined });
  });

  test("should sync messages when register win again", async () => {
    let [mainAppStore, rendererAppStore] = initAppStore(
      [
        declareStore(TodoStore, [], { stateKey: "mainTodo", storeKey: "mainTodoStore" }),
        declareWinStore(TodoStore, [], { stateKey: "winMainTodo", storeKey: "winMainTodoStore" }),
      ],
      [declareStore(TodoStore, [], { stateKey: "todo", storeKey: "todoStore" })]
    );
    let mainTodoStore = rendererAppStore.requestStore("mainTodoStore");
    jest.runAllTimers();
    expect(rendererAppStore.state).toEqual({ mainTodo: { hello: "hello1" } });

    mainTodoStore.setState({ hello: immutable.Map({ hello: "world" }) });
    jest.runAllTimers();
    expect(rendererAppStore.state).toEqual({ mainTodo: { hello: immutable.Map({ hello: "world" }) } });

    mainTodoStore.setState({ hello: immutable.Map({ hello: "world2" }) });
    let winMainTodoStore = rendererAppStore.requestStore("winMainTodoStore");
    jest.runAllTimers();

    // Register this window again
    rendererAppStore.rendererClient.sendMainMsg(renderRegisterName, "mainClient");
    expect(rendererAppStore.state).toEqual({
      mainTodo: { hello: immutable.Map({ hello: "world2" }) },
      winMainTodo: { hello: "hello1" },
    });
  });

  test("should sync store map messages when requestStore and releaseStore", async () => {
    let [mainAppStore, rendererAppStore] = initAppStore(
      [declareStoreMap(TodoStore, [], { stateKey: "mainTodo", storeKey: "mainTodoStore" })],
      [declareStoreMap(TodoStore, [], { stateKey: "todo", storeKey: "todoStore" })]
    );
    mainAppStore.setRecycleStrategy(RecycleStrategy.Urgent);
    rendererAppStore.setRecycleStrategy(RecycleStrategy.Urgent);

    expect(rendererAppStore.state).toEqual({});
    let mainTodoStore = rendererAppStore.requestStore("mainTodoStore");
    mainTodoStore.requestStore("key1");
    mainTodoStore.requestStore("key2");

    jest.runAllTimers();
    expect(rendererAppStore.state).toEqual({ mainTodo: { key1: { hello: "hello1" }, key2: { hello: "hello1" } } });

    mainTodoStore.releaseStore("key1");
    jest.runAllTimers();
    expect(rendererAppStore.state).toEqual({ mainTodo: { key2: { hello: "hello1" } } });
  });

  test("should sync store map messages when add and delete", async () => {
    let [mainAppStore, rendererAppStore] = initAppStore(
      [declareStoreMap(TodoStore, [], { stateKey: "mainTodo", storeKey: "mainTodoStore" })],
      [declareStoreMap(TodoStore, [], { stateKey: "todo", storeKey: "todoStore" })]
    );
    mainAppStore.setRecycleStrategy(RecycleStrategy.Urgent);
    rendererAppStore.setRecycleStrategy(RecycleStrategy.Urgent);

    expect(rendererAppStore.state).toEqual({});
    let mainTodoStore = rendererAppStore.requestStore("mainTodoStore");
    mainTodoStore.add(["key1", "key2"]);

    jest.runAllTimers();
    expect(rendererAppStore.state).toEqual({ mainTodo: { key1: { hello: "hello1" }, key2: { hello: "hello1" } } });

    mainTodoStore.delete(["key1"]);
    jest.runAllTimers();
    expect(rendererAppStore.state).toEqual({ mainTodo: { key1: null, key2: { hello: "hello1" } } });

    mainTodoStore.get("key2").reflect("good");
    jest.runAllTimers();
    expect(mainAppStore.state).toEqual({ mainTodo: { key1: undefined, key2: { hello: "good" } } });
  });

  test("should sync store list messages when setSize", async () => {
    let [mainAppStore, rendererAppStore] = initAppStore(
      [declareStoreList(TodoStore, [], { stateKey: "mainTodo", storeKey: "mainTodoStore" })],
      [declareStoreMap(TodoStore, [], { stateKey: "todo", storeKey: "todoStore" })]
    );
    mainAppStore.setRecycleStrategy(RecycleStrategy.Urgent);
    rendererAppStore.setRecycleStrategy(RecycleStrategy.Urgent);

    expect(rendererAppStore.state).toEqual({});
    let mainTodoStore = rendererAppStore.requestStore("mainTodoStore");
    mainTodoStore.setSize(2);

    jest.runAllTimers();
    expect(rendererAppStore.state).toEqual({ mainTodo: { 0: { hello: "hello1" }, 1: { hello: "hello1" } } });

    mainTodoStore.setSize(1);
    jest.runAllTimers();
    expect(rendererAppStore.state).toEqual({ mainTodo: { 0: { hello: "hello1" }, 1: null } });

    mainTodoStore.get(0).reflect("good");
    jest.runAllTimers();
    expect(mainAppStore.state).toEqual({ mainTodo: { 0: { hello: "good" }, 1: undefined } });
  });

  test("should sync store list messages when setSize", async () => {
    let [mainAppStore, rendererAppStore] = initAppStore(
      [declareStore(TodoStore, [], { stateKey: "mainTodo", storeKey: "mainTodoStore" })],
      [declareStore(TodoStore, [], { stateKey: "todo", storeKey: "todoStore" })]
    );
    let mainTodoStore = rendererAppStore.requestStore("mainTodoStore");

    mainTodoStore.reflect("hello");
    jest.runAllTimers();
    expect(mainAppStore.state).toEqual({ mainTodo: { hello: "hello" } });

    expect(await mainTodoStore.retReflect("world")).toEqual("world");
    jest.runAllTimers();
    expect(mainAppStore.state).toEqual({ mainTodo: { hello: "world" } });

    let observer = jest.fn();
    let disposable = mainTodoStore.onDidUpdate(observer);
    mainTodoStore.reflect("new");
    expect(observer).toHaveBeenLastCalledWith({ hello: "new" });

    observer.mockReset();
    disposable.dispose();
    mainTodoStore.reflect("new2");
    expect(observer).not.toHaveBeenCalled();
  });

  test("should sync store list size and store map keys to renderer process", async () => {
    let [mainAppStore, rendererAppStore] = initAppStore(
      [
        declareStoreList(TodoStore, [], { stateKey: "todoList", storeKey: "todoListStore", size: 1 }),
        declareStoreMap(TodoStore, [], { stateKey: "todoMap", storeKey: "todoMapStore", keys: ["key1"] }),
      ],
      [declareStore(TodoStore, [], { stateKey: "todo", storeKey: "todoStore" })]
    );

    let todoListStore = rendererAppStore.requestStore("todoListStore");
    let todoMapStore = rendererAppStore.requestStore("todoMapStore");
    jest.runAllTimers();
    expect(rendererAppStore.state).toEqual({
      todoList: { 0: { hello: "hello1" } },
      todoMap: { key1: { hello: "hello1" } },
    });
  });
});
