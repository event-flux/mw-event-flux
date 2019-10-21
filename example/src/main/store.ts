import { StoreBase, invoker } from "event-flux";
import { declareStore, declareStoreMap, declareStoreList } from "event-flux";
import storage from "./storage";
import { declareWinStore } from "../../../src/StoreDeclarer";
import { Map, List } from "immutable";

function isDefined(s) {
  return typeof s !== "undefined";
}

class Todo4Store extends StoreBase<any> {
  constructor(appStore) {
    super(appStore);
    this.state = { todo4Map: Map(), todo4List: List() };
  }

  addKey(key, val) {
    this.setState({ todo4Map: this.state.todo4Map.set(key, val) });
  }

  increase() {
    this.setState({ todo4List: this.state.todo4List.push(1) });
  }

  removeKey(key) {
    this.setState({ todo4Map: this.state.todo4Map.delete(key) });
  }
}

export const todo4StoreDeclarer = declareStore(Todo4Store);

class Todo3Store extends StoreBase<any> {
  storage: any;

  constructor(appStore) {
    super(appStore);
    this.state = { size: 0 };
  }

  willInit() {
    console.log("todo3, willInit", this.mapKey, this.listIndex);
    let storeKey = "todo3";
    if (isDefined(this.mapKey)) {
      storeKey = this.mapKey;
    } else if (isDefined(this.listIndex)) {
      storeKey = this.listIndex.toString();
    }
    this.storage = this.parentStore.storage.getNSStore(storeKey);
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

export const todo3StoreDeclarer = declareStore(Todo3Store);
export const todo3ListDeclarer = declareStoreList(Todo3Store, { storeKey: "todo3StoreList", size: 1 });
export const todo3MapDeclarer = declareStoreMap(Todo3Store, {
  storeKey: "todo3StoreMap",
  keys: ["myKey"],
});

class Todo2Store extends StoreBase<any> {
  parentStore: any;
  storage: any;

  constructor(appStore) {
    super(appStore);
    this.state = { size: 0, todo3List: [], todo3Map: {} };
  }

  willInit() {
    console.log("todo2, willInit");
    this.storage = this.parentStore.storage.getNSStore("todo2");
    this.setState({
      size: this.storage.get("size") || 0,
    });
  }

  addSize() {
    this.setState({ size: this.state.size + 1 });
    this.storage.set("size", this.state.size + 1);
  }

  decreaseSize() {
    this.setState({ size: this.state.size - 1 });
    this.storage.set("size", this.state.size - 1);
  }
}

export const todo2StoreDeclarer = declareStore(Todo2Store);

class TodoStore extends StoreBase<any> {
  clientId: any;
  storage: any;

  constructor(appStore) {
    super(appStore);
    this.state = { count: 0 };
  }

  init() {
    let clientId = this.clientId;
    console.log("clientId:", clientId);
    this.storage = clientId ? storage.getNSStore(clientId) : storage;
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
export const winTodoStoreDeclarer = declareWinStore(TodoStore);
