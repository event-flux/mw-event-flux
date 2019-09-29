import RendererAppStore from "../RendererAppStore";
import { StoreProxy } from "../StoreProxy";
import { declareStore, StoreBase, RecycleStrategy } from "event-flux";
import { encodeQuery } from "../utils/queryHandler";
import { IOutStoreDeclarer } from "../mainClientTypes";
import { IRendererClient } from "../rendererClientTypes";
import { renderRegisterName, renderRequestStoreName, renderReleaseStoreName } from "../constants";

jest.mock("../RendererClient", () => {
  class MyRenderClient implements IRendererClient {
    sendMainMsg = jest.fn();
    getQuery() {
      return (window as any).query;
    }
  }
  return { default: MyRenderClient };
});

jest.useFakeTimers();

describe("RendererAppStore", () => {
  test("constructor with storeDeclares and init", () => {
    let mainDeclares: IOutStoreDeclarer[] = [
      { storeType: "Item", storeKey: "mainTodoStore", stateKey: "mainTodo", depStoreNames: [] },
    ];
    (window as any).query = {
      winId: "win1",
      storeDeclarers: JSON.stringify(mainDeclares),
      state: JSON.stringify({ hello: 1 }),
    };

    let appStore = new RendererAppStore([declareStore(StoreBase, [], { storeKey: "todo1Store", stateKey: "todo1" })]);
    expect(appStore.state).toEqual({ hello: 1 });
    expect(Object.keys(appStore._storeRegisterMap).sort()).toEqual(["mainTodoStore", "todo1Store"]);
    expect(appStore._storeRegisterMap.mainTodoStore.Store).toBe(StoreProxy);
    expect(appStore.rendererClient.sendMainMsg).toHaveBeenLastCalledWith(renderRegisterName, "win1");
  });

  test.skip("request and release stores that in the renderer process", () => {
    (window as any).query = {
      winId: "win1",
      storeDeclarers: JSON.stringify([
        { storeType: "Item", storeKey: "mainTodo1Store", stateKey: "main1Todo", depStoreNames: [] },
        { storeType: "Item", storeKey: "mainTodo2Store", stateKey: "main2Todo", depStoreNames: ["mainTodo1Store"] },
      ]),
      state: JSON.stringify({ hello: 1 }),
    };
    let appStore = new RendererAppStore([
      declareStore(StoreBase, [], { storeKey: "todo1Store", stateKey: "todo1" }),
      declareStore(StoreBase, ["todo1Store"], { storeKey: "todo2Store", stateKey: "todo2" }),
      declareStore(StoreBase, ["mainTodo1Store"], { storeKey: "todo3Store", stateKey: "todo2" }),
    ]);
    appStore.setRecycleStrategy(RecycleStrategy.Urgent);
    appStore.init();

    (appStore.rendererClient.sendMainMsg as jest.Mock).mockReset();

    appStore.requestStore("todo2Store");
    expect(Object.keys(appStore.stores).sort()).toEqual(["todo1Store", "todo2Store"]);

    appStore.releaseStore("todo2Store");
    expect(appStore.stores).toEqual({});
    expect(appStore.rendererClient.sendMainMsg as jest.Mock).not.toHaveBeenCalled();

    (appStore.rendererClient.sendMainMsg as jest.Mock).mockReset();
    appStore.requestStore("mainTodo2Store");
    expect(Object.keys(appStore.stores).sort()).toEqual(["mainTodo1Store", "mainTodo2Store"]);
    expect(appStore.rendererClient.sendMainMsg as jest.Mock).toHaveBeenLastCalledWith(renderRequestStoreName, [
      "mainTodo2Store",
    ]);

    appStore.releaseStore("mainTodo2Store");
    expect(appStore.stores).toEqual({});
    expect(appStore.rendererClient.sendMainMsg as jest.Mock).toHaveBeenLastCalledWith(renderReleaseStoreName, [
      "mainTodo2Store",
    ]);

    (appStore.rendererClient.sendMainMsg as jest.Mock).mockReset();
    appStore.requestStore("todo3Store");
    expect(Object.keys(appStore.stores).sort()).toEqual(["mainTodo1Store", "todo3Store"]);

    appStore.releaseStore("todo3Store");
    expect(appStore.stores).toEqual({});
    expect(appStore.rendererClient.sendMainMsg as jest.Mock).toHaveBeenLastCalledWith(renderReleaseStoreName, [
      "mainTodo1Store",
    ]);
  });

  test("findMainDepList should can parse the dependencies", () => {
    (window as any).query = {
      winId: "win1",
      storeDeclarers: JSON.stringify([]),
      state: JSON.stringify({ hello: 1 }),
    };
    let appStore = new RendererAppStore([
      declareStore(StoreBase, [], { storeKey: "todo1Store", stateKey: "todo1", forMain: true }),
      declareStore(StoreBase, ["todo1Store"], { storeKey: "todo2Store", stateKey: "todo2" }),
      declareStore(StoreBase, ["todo1Store", "todo2Store"], { storeKey: "todo3Store", stateKey: "todo3" }),
    ]);

    expect(appStore.findMainDepList("todo2Store")).toEqual(["todo1Store"]);
    expect(appStore.findMainDepList("todo3Store")).toEqual(["todo1Store"]);
    expect(appStore.findMainDepList("todo1Store")).toEqual(["todo1Store"]);
  });
});
