// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const { ipcRenderer } = require('electron');
import RendererStore from '../src/RendererAppStore';
// const store = require('./store');

const button = document.createElement('button');
button.textContent = 'INCREMENT';

const store = new RendererStore(null, (state) => {
  button.textContent = `INCREMENT ${state.todo.count}`
});

button.onclick = () => store.todoStore.addTodo(2);

document.body.appendChild(document.createElement('br'));
document.body.appendChild(document.createElement('br'));
document.body.appendChild(button);

if (!process.guestInstanceId) {
  const webview = document.getElementById('webview');
  webview.addEventListener('dom-ready', function listener() {
    webview.loadURL(`file://${__dirname + '/index.html'}`);
    webview.removeEventListener('dom-ready', listener);
  });
}
