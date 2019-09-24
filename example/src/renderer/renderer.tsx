// Initial welcome page. Delete the following line to remove it.

// import React from 'react';
// import ReactDOM from 'react-dom';
// import RendererStore from 'electron-event-flux/lib/RendererAppStore';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import MyView from './RootView';
import rendererInit from '../../../src/rendererInitializer';
import rendererStore from './rendererStore';

const rootElement = document.createElement('div');
document.body.appendChild(rootElement);

let startDate = new Date().getTime();

function reactRender(store) {
  console.log('spent time ', new Date().getTime() - startDate, 'ms');
  console.log('render with state:', store.state);
  
  window['store'] = store;
  ReactDOM.render(<MyView store={store} state={store.state} action={window['action']}/>, rootElement);
}

const storeDeclarer = {
  renderTodo: rendererStore,
};

rendererInit(storeDeclarer, {
  renderHandler: (state) => {
    console.log('get new state:', state);
    ReactDOM.render(<MyView store={window['store']} state={state} action={window['action']}/>, rootElement);
  }, 
  actionHandler: (action) => {
    ReactDOM.render(<MyView store={window['store']} state={window['store'].state} action={window['action']}/>, rootElement);
  }
}).then(reactRender);

window.onload = () => {
  let endDate = new Date();
  console.log('load elapse milliseconds ' + (endDate.getTime() - startDate) + 'ms');
}