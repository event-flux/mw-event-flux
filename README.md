
[![Travis CI](https://travis-ci.org/event-flux/event-flux.svg?branch=master)](https://travis-ci.org/event-flux/event-flux)
[![codecov](https://codecov.io/gh/event-flux/event-flux/branch/master/graph/badge.svg)](https://codecov.io/gh/event-flux/event-flux)
[![npm version](https://badge.fury.io/js/event-flux.svg)](https://www.npmjs.com/package/event-flux)
[![Downloads](https://img.shields.io/npm/dm/event-flux.svg)](https://www.npmjs.com/package/event-flux)

# event-flux


event-flux是一个用于Javascript App的状态管理框架。它是为强交互的大型应用而生。
凭借着event-flux的强大数据流，加上诸如React的声明式组件式视图库，我们能打造可沉浸的，强交互性的，令人印象深刻的跨平台App。

electron-event-flux是event-flux的升级版本，增加了对多窗口支持的能力。

## 为什么选择event-flux

* 基于Flux的状态管理

  event-flux遵循Flux的单向数据流，保证数据合UI的一致性。

* 基于事件的模块化的状态管理器

  event-flux中每个模块都是一个Store，Store维持着自己的生命周期和管理自己状态。例如用户登录管理，Todo List等都可以做成独立的Store。不同的Store之间通过事件机制来进行通信和交互。Store之间可以形成嵌套形式，从而构成一颗Store树。每个Store维护着自己的State，所有的的State构成一棵状态树。
  
  当UI Dispatch一个动作时，会发送到对应的Store，然后Store会改变自己的状态，通过相应的事件从而改变其他Store的状态。顶层Store会收集改变的State，然后通知UI更新。

* 支持多窗口可交互

  event-flux通过运行在一个窗口中运行主模块，然后其他窗口通过代理发送消息到主窗口模块来支持多窗口可交互的应用。event-flux支持在Electron和浏览器环境下运行。

* 简单强大，开箱即用的状态管理器

  无需像Redux一样需要那么多启动代码，event-flux通过简单高效的API来极大提高了开发效率。event-flux封装了状态管理的方方面面，用户只需要很少的初始化来启动应用，从而专注我们自己的业务。

  Enjoy coding!
 
## 安装

安装稳定版通过:

```
npm install --save electron-event-flux
```

## 多窗口实现原理

electron-event-flux提供了简单方便的解决方案。主进程的Store变成了真正的逻辑处理中心，渲染进程的Store只是一个Proxy。当Renderer进程调用Action时，系统会将请求转发给主进程。开发者可以像之前一样调用Store的Action，但是Action的真正处理单元还是主进程。

当主进程的State树改变时，主进程会将state的diff发送给所有的Renderer进程，然后Renderer进程可以在已有的state上合并这些diff，然后通知所有的UI组件。

electron-event-flux提供了一个简单的中间层来进行透明的转发。我们还是可以像之前写单页面来实现多窗口交互，从而实现了无缝的透明的开发体验。

![交互示意图](https://cloud.githubusercontent.com/assets/307162/20675737/385ce59e-b585-11e6-947e-3867e77c783d.png)

同时我们的多屏方案也适用于浏览器，我们会把第一个窗口当作主窗口，将Electron的主进程逻辑实现在主窗口中。其他的子窗口通过`PostMessage`来与主窗口通信，通过实现跟Electron相似的逻辑来实现我们的透明转发层，进而实现我们的多窗口方案。

## Gist

初始化Main Process：

```js
import TodoStore from '../main/store';
import MultiWinStore from 'electron-event-flux/lib/MultiWinStore';
import buildMultiWinAppStore from 'electron-event-flux/lib/MainAppStore';
import query from './parseQuery';

class MyMultiWinStore extends MultiWinStore {
  createBrowserWin(url) {
    return window.open(url, "newwindow", "height=400, width=400, toolbar=no, menubar=no, scrollbars=no, resizable=no, location=no, status=no")
  }
}

if (!query.isSlave) {
  const appStore = buildMultiWinAppStore({ todo: TodoStore, multiWin: MyMultiWinStore }, { winTodo: TodoStore });
}

require('./renderer');
```

初始化RendererAppStore，然后开始专注于我们自己的业务吧：

```js
import RendererStore from 'electron-event-flux/lib/RendererAppStore';

const store = new RendererStore((state) => {
  console.log(state);
  ReactDOM.render(<MyView state={state}/>, rootElement);
});
store.init().then(() => {
  ReactDOM.render(<MyView state={store.state}/>, rootElement);
});

```

## Store 

继承`StoreBase`，设置Store的State，写下用户或者UI可以调用的Action方法，一个内省的Store就创建好了。就这么简单。

```js
import StoreBase from 'event-flux/lib/StoreBase';
const { Map, List } = require('immutable');

class TodoStore extends StoreBase {
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
```

## State

如上代码片段，我们的State那日不对象是不变的！类似`Redux`，我们不允许将State内部的对象直接操作改变。**只能通过setState来更新状态。**

event-flux拥抱Immutable.js!。我们的State内部状态值除了可以是普通Object，同时也可以是Immutable Map和Immutable List。Immutable能大大减少操作对象的成本，并且也能避免直接改变State对象的误操作。

## 订阅和反订阅

在我们的使用场景中，很多情况下需要订阅和取消订阅Store的状态变化。由于Store和订阅函数可能运行在不同进程中，因此我们需要使用如下方式来进行订阅。

Store需要继承自`SubStoreBase`，Store的返回值必须是`getSubId`的返回值（一个代表订阅的ID)。当使用方进行订阅操作时，需要保存返回的ID，然后当不在使用的时候unsubscribe。

```js
import StoreBase from 'electron-event-flux/lib/SubStoreBase';

class TodoStore extends StoreBase {
  constructor() {
    super();
    this.state = { count: 0 };
  }

  subscribeCount() {
    let intervalId = setInterval(() => this.setState({ count: this.state.count + 1 }), 1000);
    return this.genSubId({ dispose: () => clearInterval(intervalId) });
  }
}

/// invoke in Renderer process, subscribe the store event
let subId = await todoStore.subscribeCount()

/// unsubscribe the store event
todoStore.unsubscribe(subId)
```

## 嵌套Store

Store是通过声明的方式来表达不同Store之间的关系。Store里面可以嵌套子Store，也可以嵌套Store数组(StoreList)，还可以嵌套Store Map。

StoreList可以在运行中调用`setSize`来动态改变StoreList的大小。StoreMap可以在运行中通过`add`和`delete`来动态添加和删除key。

```js
class Todo3Store extends StoreBase {
  constructor() {
    super();
    this.state = { size: 0 };
  }

  addSize() {
    let newSize = this.state.size + 1;
    this.setState({ size: newSize });
  }

  decreaseSize() {
    let newSize = this.state.size - 1;
    this.setState({ size: newSize });
  }
}

class Todo2Store extends StoreBase {
  constructor() {
    super();
    this.state = { size: 0, todo3List: [], todo3Map: {} };
  }

  addSize() {
    this.setState({ size: this.state.size + 1 });
  }

  decreaseSize() {
    this.setState({ size: this.state.size - 1 });
  }
}
Todo2Store.innerStores = {
  todo3: declareStore(Todo3Store),
  todo3List: declareStoreList(Todo3Store, { storeKey: 'todo3StoreList', size: 1 }),
  todo3Map: declareStoreMap(Todo3Store, { storeKey: 'todo3StoreMap', keys: ['myKey'] }),
};
```

## 监听Store

很多情况下，我们需要监听其他Store的变化，这时候我们需要使用Store的事件接口来监听各种事件。

```js
class UserStore extends StoreBase {
  constructor() {
    super();
    this.state = { isLogin: false };
  }

  login(username) {
    this.setState({ isLogin: true, username });
    this.emitter.emit('did-login', username);
  }

  onDidLogin(callback) {
    this.emitter.on('did-login', callback);
  }
}

class OtherStore extends StoreBase {
  init() {
    this.stores.userStore.onDidLogin(() => {
      console.log('user has login, do something...');
    });
  }
}

```

## License

MIT

# redux-electron-store
[![npm version](https://img.shields.io/npm/v/redux-electron-store.svg?style=flat-square)](https://www.npmjs.com/package/redux-electron-store)

This library solves the problem of synchronizing [Redux](https://github.com/rackt/redux/) stores in [Electron](https://github.com/atom/electron) apps. Electron is based on Chromium, and thus all Electron apps have a single [main process](https://github.com/atom/electron/blob/master/docs/tutorial/quick-start.md#differences-between-main-process-and-renderer-process) and (potentially) multiple renderer processes, one for each web page. `redux-electron-store` allows us to define a store per process, and uses [`ipc`](https://github.com/atom/electron/blob/master/docs/api/ipc-main.md) to keep them in sync.  It is implemented as a [redux store enhancer](https://github.com/reactjs/redux/blob/master/docs/Glossary.md#store-enhancer).

This library __only__ works if the data in your store is __immutable__, as objects are compared by reference to determine changes.  The data being synchronized must also be pure JavaScript objects.

## Installation

```bash
npm i redux-electron-store --save
```

## Usage

#### Main Process

```javascript
import { createStore, applyMiddleware, compose } from 'redux';
import { electronEnhancer } from 'redux-electron-store';

let enhancer = compose(
  applyMiddleware(...middleware),
  // Must be placed after any enhancers which dispatch
  // their own actions such as redux-thunk or redux-saga
  electronEnhancer({
    // Necessary for synched actions to pass through all enhancers
    dispatchProxy: a => store.dispatch(a),
  })
);

// Note: passing enhancer as the last argument to createStore requires redux@>=3.1.0
let store = createStore(reducer, initialState, enhancer);
```

#### Renderer / Webview Process

```javascript
let enhancer = compose(
  applyMiddleware(...middleware),
  electronEnhancer({
    dispatchProxy: a => store.dispatch(a),
  }),
  DevTools.instrument()
);

let store = createStore(reducer, initialState, enhancer);
```

#### Filters

In the renderer process, an important parameter that can improve performance is `filter`.  `filter` is a way of describing exactly what data this renderer process wishes to be notified of.  If a filter is provided, all updates which do not change a property which passes the filter will not be forwarded to the current renderer.

A filter can be an `object`, a `function`, or `true`.

If the filter is `true`, the entire variable will pass through the filter.

If the filter is a `function`, the function will be called on every dispatch with the variable the filter is acting on as a parameter, and the return value of the function must itself be a filter (either an `object` or `true`)

If the filter is an `object`, its keys must be properties of the variable the filter is acting on, and its values are themselves filters which describe the value(s) of that property that will pass through the filter.

**Example Problem**:

>I am creating a Notifications window for Slack's application.  For this to work, I need to know the position to display the notifications, the notifications themselves, and the icons for each team to display as a thumbnail.  Any other data in my app has no bearing on this window, therefore it would be a waste for this window to have updates for any other data sent to it.

**Solution**:
```javascript
// Note: The Lodash library is being used here as _
let filter = {
  notifications: true,
  settings: {
    notifyPosition: true
  },
  teams: (teams) => {
    return _.mapValues(teams, (team) => {
      return {icons: true};
    });
  }
};
```

More options are documented in the [api docs](https://github.com/samiskin/redux-electron-store/blob/master/docs/api.md), and a description of exactly how this library works is on the way.  

#### Hot Reloading Reducers


Hot reloading of reducers needs to be done on both the renderer and the main process.  Doing this requires two things:

- The renderer needs to inform the main process when it has reloaded
  ```js
  // In the renderer process
  if (module.hot) {
    module.hot.accept('../reducers', () => {
      ipc.sendSync('renderer-reload');
      store.replaceReducer(require('../reducers'))
    });
  }
  ```

- The main process needs to delete its cached `reducers` data
  ```js
  // In the main process
  ipcMain.on('renderer-reload', (event, action) => {
    delete require.cache[require.resolve('../reducers')];
    store.replaceReducer(require('../reducers'));
    event.returnValue = true;
  });
  ```
  - Note: Individual reducer files may also need to be deleted from the cache if they have been required elsewhere in the application




## How it works

#### Initialization
1. The main process creates its store
2. When a renderer is created, it copies the current state from the main process for its own initial state
3. The renderer then registers itself with the main process along with its "filter"

#### Runtime
1. An action occurs in either the renderer or the main process
2. If it was in a renderer, the action is run through the reducer and forwarded to the main process
3. The main process runs the action through the reducer
4. The main process compares its state prior to the reduction with the new state, and with reference checks (hence the need for immutable data), it determines what data in its store changed
5. The main process then iterates through each registered renderer. If the data that changed is described in that renderer's filter, the main process IPC's over an action with `data: { updated: {...}, deleted: {...} }` properties
6. The renderers that receive that action will then merge in that data, thereby staying in sync with the main process, while not repeating the processing done by the reduction

### License

MIT
