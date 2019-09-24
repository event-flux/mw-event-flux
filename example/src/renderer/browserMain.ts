import TodoStore from '../main/store';
import MultiWinStore from '../../../src/MultiWinStore';
import buildMultiWinAppStore from '../../../src/MainAppStore';
import query from './parseQuery';

class MyMultiWinStore extends MultiWinStore {
  createBrowserWin(url) {
    return window.open(url, "newwindow", "height=400, width=400, toolbar=no, menubar=no, scrollbars=no, resizable=no, location=no, status=no")
  }
}

if (!query.isSlave) {
  const appStore = buildMultiWinAppStore({ todo: TodoStore }, { winTodo: TodoStore }, {
    WinHandleStore: MyMultiWinStore
  }, console.log);
}

require('./index');