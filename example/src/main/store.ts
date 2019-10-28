import { StoreBase, invoker } from "event-flux";
import { declareStore, declareStoreMap, declareStoreList } from "event-flux";
import storage from "./storage";
import { declareWinStore } from "mw-event-flux/lib/StoreDeclarer";
import { Map, List } from "immutable";

function isDefined(s) {
  return typeof s !== "undefined";
}

class ImmutableStore extends StoreBase<any> {
  constructor(appStore) {
    super(appStore);
    this.state = { immutableMap: Map(), immutableList: List() };
  }

  addKey(key, val) {
    this.setState({ immutableMap: this.state.immutableMap.set(key, val) });
  }

  increase() {
    this.setState({ immutableList: this.state.immutableList.push(1) });
  }

  removeKey(key) {
    this.setState({ immutableMap: this.state.immutableMap.delete(key) });
  }
}

export const immutableStoreDeclarer = declareStore(ImmutableStore);

class SimpleStore extends StoreBase<any> {
  storage: any;

  constructor(appStore) {
    super(appStore);
    this.state = { size: 0 };
  }

  init() {
    console.log("simpleStore.init", this.mapKey, this.listIndex);
    let storeKey = "simple";
    if (isDefined(this.mapKey)) {
      storeKey = "simple@" + this.mapKey;
    } else if (isDefined(this.listIndex)) {
      storeKey = "simple@" + this.listIndex.toString();
    }
    this.storage = storage.getNSStore(storeKey);
    this.setState({
      size: this.storage.get("size") || 0,
    });
  }

  addSize() {
    let newSize = this.state.size + 1;
    this.setState({ size: newSize });
    this.storage.set("size", newSize);
    return newSize;
  }

  decreaseSize() {
    let newSize = this.state.size - 1;
    this.setState({ size: newSize });
    this.storage.set("size", newSize);
    return newSize;
  }
}

export const simpleStoreDeclarer = declareStore(SimpleStore);
export const simpleListDeclarer = declareStoreList(SimpleStore, {
  storeKey: "simpleStoreList",
  stateKey: "simpleList",
  size: 1,
});

export const simpleMapDeclarer = declareStoreMap(SimpleStore, {
  storeKey: "simpleStoreMap",
  stateKey: "simpleMap",
  keys: ["myKey"],
});

export const dynamicMapDeclarer = declareStoreMap(SimpleStore, {
  storeKey: "dynamicStoreMap",
  stateKey: "dynamicMap",
});

class TodoStore extends StoreBase<any> {
  winId: any;
  storage: any;

  constructor(appStore) {
    super(appStore);
    this.state = { count: 0 };
  }

  init() {
    let winId = this.winId;
    console.log("winId:", winId);
    this.storage = winId ? storage.getNSStore(winId) : storage;
    this.setState({
      count: this.storage.get("count") || 0,
      isComplete: this.storage.get("isComplete"),
    });
  }

  addTodo(num) {
    console.log("add todo");
    this.setState({ count: this.state.count + num });
    this.storage.set("count", this.state.count + num);
  }

  decreaseTodo(num) {
    this.setState({ count: this.state.count - num });
    this.storage.set("count", this.state.count - num);
  }

  setComplete(isComplete) {
    console.log("set complete:", isComplete);
    this.setState({ isComplete });
    this.storage.set("isComplete", isComplete);
  }

  @invoker
  getObject() {
    console.log("will get object clientId");
    return { clientId: "hello" };
  }

  @invoker
  getAsyncObject() {
    console.log("will get object clientId");
    return new Promise(resolve => {
      setTimeout(() => resolve({ clientId: "hello" }), 100);
    });
  }

  @invoker
  getObjectThrow() {
    console.log("will throw object");
    throw new Error("throw object error");
  }

  dispose() {
    super.dispose();
    // this.storage.deleteAll();
  }
}
export const todoStoreDeclarer = declareStore(TodoStore);
export const winTodoStoreDeclarer = declareWinStore(TodoStore, { storeKey: "winTodoStore", stateKey: "winTodo" });
