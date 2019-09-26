/**
 * StoreProxyHandler construct the store proxy by the store filter
 *  storeFilter is like this:
 * 1. todoStore: { filters: {todo2Store: {}, type: "Store" }
 * 2. winTodoStore: {
 *      filters: null,
 *      path: ["winManagerStore", {type: "Map", name: "winPackMapStore", index: "mainClient"} },
 *      type: "Store",
 *    }
 * 3. todo3StoreList: { type: "StoreList", filters: null }
 * 4. todo3StoreMap: { type: "StoreMap", filters: null }
 */
import StoreProxyHandler from "../StoreProxyHandler";

test("One Store test", () => {
  let forwarder = jest.fn();
  let proxyHandler = new StoreProxyHandler();
  let resProxy = proxyHandler.proxyStores(
    {
      todoStore: { type: "Store", filters: { todo2Store: { type: "Store", filters: null } } },
    },
    forwarder
  );

  resProxy.todoStore.getTodoStore("hello");
  expect(forwarder).toHaveBeenCalledWith({
    store: ["todoStore"],
    method: "getTodoStore",
    args: ["hello"],
  });

  resProxy.todoStore.todo2Store.getTodo2Store("hello", "world");
  expect(forwarder).toHaveBeenCalledWith({
    store: ["todoStore", "todo2Store"],
    method: "getTodo2Store",
    args: ["hello", "world"],
  });
});

test("One Store with path test", () => {
  let forwarder = jest.fn();
  let proxyHandler = new StoreProxyHandler();
  let resProxy = proxyHandler.proxyStores(
    {
      winTodoStore: {
        type: "Store",
        filters: null,
        path: ["winManagerStore", { type: "Map", name: "winPackMapStore", index: "mainClient" }],
      },
    },
    forwarder
  );

  resProxy.winTodoStore.getTodoStore("hello");
  expect(forwarder).toHaveBeenCalledWith({
    store: ["winManagerStore", { type: "Map", name: "winPackMapStore", index: "mainClient" }, "winTodoStore"],
    method: "getTodoStore",
    args: ["hello"],
  });
});

test("Store List with path test", () => {
  let forwarder = jest.fn();
  let proxyHandler = new StoreProxyHandler();
  let resProxy = proxyHandler.proxyStores(
    {
      storeList: { type: "StoreList", filters: null },
    },
    forwarder
  );

  resProxy.storeList.listen("hello");
  expect(forwarder).toHaveBeenCalledWith({
    store: ["storeList"],
    method: "listen",
    args: [undefined, "hello"],
  });

  resProxy.storeList[0].listen("ddd");
  expect(forwarder).toHaveBeenCalledWith({
    store: [{ type: "List", name: "storeList", index: "0" }],
    method: "listen",
    args: [undefined, "ddd"],
  });

  expect(resProxy.storeList[0]).toBe(resProxy.storeList[0]);
});

test("Store Map with path test", () => {
  let forwarder = jest.fn();
  let proxyHandler = new StoreProxyHandler();
  let resProxy = proxyHandler.proxyStores(
    {
      storeMap: { type: "StoreMap", filters: null },
    },
    forwarder
  );

  resProxy.storeMap.key1.listen("ddd");
  expect(forwarder).toHaveBeenCalledWith({
    store: [{ type: "Map", name: "storeMap", index: "key1" }],
    method: "listen",
    args: [undefined, "ddd"],
  });

  resProxy.storeMap.listen("hello");
  expect(forwarder).toHaveBeenCalledWith({
    store: ["storeMap"],
    method: "listen",
    args: [undefined, "hello"],
  });

  expect(resProxy.storeMap.key2).toBe(resProxy.storeMap.key2);
});
