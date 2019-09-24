import StoreBase from '../../../src/MainStoreBase';
import { declareStore, declareStoreMap, declareStoreList } from '../../../src/StoreDeclarer';
import storage from './storage';
const { Map, List } = require('immutable')

function isDefined(s) {
  return typeof s !== 'undefined';
}

class Todo4Store extends StoreBase {
  constructor() {
    super();
    this.state = { todo4Map: new Map(), todo4List: new List() };
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

class Todo3Store extends StoreBase {
  mapStoreKey: any;
  listStoreKey: any;
  storage: any;
  parentStore: any;

  constructor() {
    super();
    this.state = { size: 0 };
  }

  willInit() {
    console.log('todo3, willInit', this.mapStoreKey, this.listStoreKey);
    let storeKey = 'todo3'; 
    if (isDefined(this.mapStoreKey)) {
      storeKey = this.mapStoreKey;
    } else if (isDefined(this.listStoreKey)) {
      storeKey = this.listStoreKey;
    }
    this.storage = this.parentStore.storage.getNSStore(storeKey);
    this.setState({
      size: this.storage.get('size') || 0,
    });
  }

  addSize() {
    let newSize = this.state.size + 1;
    this.setState({ size: newSize });
    this.storage.set('size', newSize);
    return newSize;
  }

  decreaseSize() {
    let newSize = this.state.size - 1;
    this.setState({ size: newSize });
    this.storage.set('size', newSize);
    return newSize;
  }
}

class Todo2Store extends StoreBase {
  parentStore: any;
  storage: any;

  constructor(arg) {
    super();
    console.log('todo2 store arg:', arg)
    this.state = { size: 0, todo3List: [], todo3Map: {} };
  }

  willInit() {
    console.log('todo2, willInit');
    this.storage = this.parentStore.storage.getNSStore('todo2');
    this.setState({
      size: this.storage.get('size') || 0,
    });
  }

  addSize() {
    this.setState({ size: this.state.size + 1 });
    this.storage.set('size', this.state.size + 1);
  }

  decreaseSize() {
    this.setState({ size: this.state.size - 1 });
    this.storage.set('size', this.state.size - 1);
  }
}
Todo2Store.innerStores = {
  todo3: declareStore(Todo3Store),
  todo4: declareStore(Todo4Store),
  todo3List: declareStoreList(Todo3Store, { storeKey: 'todo3StoreList', size: 1 }),
  todo3Map: declareStoreMap(Todo3Store, {
    storeKey: 'todo3StoreMap', keys: ['myKey'], storeDefaultFilter: true,
  }),
};

class TodoStore extends StoreBase {
  clientId: any;
  storage: any;

  constructor(arg) {
    super();
    console.log('arg:', arg);
    this.state = { count: 0 };
  }

  willInit() {
    let clientId = this.clientId;
    console.log('clientId:', clientId);
    this.storage = clientId ? storage.getNSStore(clientId) : storage; 
    this.setState({
      count: this.storage.get('count') || 0,
      isComplete: this.storage.get('isComplete'),
    });
  }

  addTodo(num) {
    console.log('add todo')
    this.setState({ count: this.state.count + num });
    this.storage.set('count', this.state.count + num);
  }

  decreaseTodo(num) {
    this.setState({ count: this.state.count - num });
    this.storage.set('count', this.state.count - num);
  }

  setComplete(isComplete) {
    console.log('set complete:', isComplete)
    this.setState({ isComplete });
    this.storage.set('isComplete', isComplete);
  }

  getObject() {
    console.log('will get object clientId');
    return { clientId: 'hello' };
  }

  getAsyncObject() {
    console.log('will get object clientId');
    return new Promise((resolve) => {
      setTimeout(() => resolve({clientId: 'hello'}), 100);
    });
  }

  getObjectThrow() {
    console.log('will throw object');
    throw new Error('throw object error');
  }

  dispose() {
    super.dispose();
    // this.storage.deleteAll();
  }
}
TodoStore.innerStores = { todo2: declareStore(Todo2Store, { args: ['hello'] }) };

export default TodoStore;