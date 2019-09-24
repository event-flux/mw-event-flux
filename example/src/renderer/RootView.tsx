// import React from 'react';
// import ReactDOM from 'react-dom';
// import RendererStore from 'electron-event-flux/lib/RendererAppStore';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import OneDemoView from './OneDemoView';
import Button from '@material-ui/core/Button';

import TodoCountDemo from './views/TodoCount';
import Todo2CountDemo from './views/Todo2Count';
import Todo3CountDemo from './views/Todo3Count';
import Todo4CountDemo from './views/Todo4Count';

const styleElement = document.createElement('style');
styleElement.innerHTML = 'body { margin: 0; }';
document.head.appendChild(styleElement);


class NewButton extends React.PureComponent<any, any> {
  constructor(props) {
    super(props);
    this.createNewWindow = this.createNewWindow.bind(this);
    this.createDemo1 = this.createDemo1.bind(this);
    this.createDemo2 = this.createDemo2.bind(this);
    this.createDemo3 = this.createDemo3.bind(this);
  }

  createNewWindow() {
    let { store, sizes: { width, outerHeight, demo1Height, demo2Height, demo3Height } } = this.props;

    store.stores.multiWinStore.createWin('/', { 
      width, height: outerHeight, useContentSize: true, 
      minWidth: 300, minHeight: 300,
      maxWidth: 600, maxHeight: 600,
      title: 'Hello World',
    });
  }
  
  mergePos(size, pos) {
    if (!pos) {
      pos = { midX: window.screenX + window.outerWidth / 2, midY: window.screenY + window.outerHeight / 2 };
    }
    return { ...size, x: pos.midX - size.width / 2, y: pos.midY - size.height / 2 };
  }

  createDemo1(pos) {
    let { store, sizes: { width, outerHeight, demo1Height, demo2Height, demo3Height } } = this.props;

    let params = { 
      width, height: outerHeight - demo2Height - demo3Height, useContentSize: true,
    };
    console.log('new demo1 pos:', this.mergePos(params, pos))
    let childWin = store.stores.multiWinStore.createWin('/demo1', this.mergePos(params, pos));
    childWin.onDidReceiveMsg((msg) => { 
      console.log('receive child message: ', msg)
      childWin.send(msg);
    });
  }
  createDemo2(pos) {
    let { store, sizes: { width, outerHeight, demo1Height, demo2Height, demo3Height } } = this.props;

    let params = {
      width: width, height: outerHeight - demo1Height - demo3Height, useContentSize: true,
    }
    store.stores.multiWinStore.createWin('/demo2', this.mergePos(params, pos));
  }
  createDemo3(pos) {
    let { store, sizes: { width, outerHeight, demo1Height, demo2Height, demo3Height } } = this.props;

    let params = {
      width: width, height: outerHeight - demo1Height - demo2Height, useContentSize: true,
    };
    store.stores.multiWinStore.createWin('/demo3', this.mergePos(params, pos));
  }

  buttonGet(name) {
    return (ref) => this[name] = ref;
  }

  click(name) {
    ReactDOM.findDOMNode(this[name]).click();
  }

  render() {
    return (
      <div>
        <Button onClick={this.createNewWindow}>Create New Window</Button>
        <Button ref={this.buttonGet('demo1')} onClick={this.createDemo1}>Create Demo1</Button>
        <Button ref={this.buttonGet('demo2')} onClick={this.createDemo2}>Create Demo2</Button>
        <Button ref={this.buttonGet('demo3')} onClick={this.createDemo3}>Create Demo3</Button>
      </div>
    );
  }
}

export default class MyView extends React.PureComponent<any, any> {
  buttons: any;

  constructor(props) {
    super(props);
    this.state = {};
    let { store: { stores } } = props;
    stores.todoStore.listen();
    stores.todoStore.todo2Store.listen();
    stores.todoStore.todo2Store.todo3Store.listen();
    stores.todoStore.todo2Store.todo4Store.listen();
    // stores.todoStore.todo2Store.todo3StoreList.listen(window['clientId']);
    stores.todoStore.todo2Store.todo3StoreMap.listenForKeys('myKey');

    stores.winTodoStore.listen();
    stores.winTodoStore.todo2Store.listen();
    stores.winTodoStore.todo2Store.todo3Store.listen();
    stores.winTodoStore.todo2Store.todo4Store.listen();
    // stores.todoStore.todo2Store.todo3StoreList.listen(window['clientId']);
    stores.winTodoStore.todo2Store.todo3StoreMap.listenForKeys('myKey');
  }

  divGetter(prop) {
    return (ref) => {
      if (!ref) return;
      ref = ReactDOM.findDOMNode(ref);
      console.log(prop, ' size:', ref.clientWidth, ref.clientHeight);
      this.setState({
        width: ref.clientWidth,
        [prop]: ref.clientHeight,
      });
    };
  }
 
  handleDragStart(item) {
    return (event) => {
      event.dataTransfer.setData('ResourceURLs', item);
      event.dataTransfer.effectAllowed = 'all'
      event.dataTransfer.dropEffect = 'copy';
    };
  }

  handleDragEnd(item) {
    return (event) => {
      event.dataTransfer.dropEffect = 'copy';
      if (!this.buttons) return;
      let pos = { midX: event.screenX, midY: event.screenY };
      if (window['process']) {
        switch (item) {
          case 'demo1': this.buttons.createDemo1(pos); break;
          case 'demo2': this.buttons.createDemo2(pos); break;
          case 'demo3': this.buttons.createDemo3(pos); break;
        }
      } else {
        this.buttons.click(item);
      }
    };
  }

  render() {
    let { store, state, action } = this.props;
    if (!state) return null;
    let sizes = { 
      width: this.state.width, demo1Height: this.state.demo1Height, demo2Height: this.state.demo2Height, 
      demo3Height: this.state.demo3Height, outerHeight: this.state.outerHeight,
    };
    console.log('action:', action)
    switch (action) {
      case '/demo1': 
        return (
          <div>
            <OneDemoView {...TodoCountDemo} store={store} state={state}/>
          </div>
        );
      case '/demo2':
        return (
          <div>
            <OneDemoView {...Todo2CountDemo} store={store} state={state}/>
          </div>
        );
      case '/demo3':
        return (
          <div>
            <OneDemoView {...Todo3CountDemo} store={store} state={state}/>
          </div>
        );
      default:
        return (
          <div ref={this.divGetter('outerHeight')}>
            <OneDemoView 
              innerRef={this.divGetter('demo1Height')} {...TodoCountDemo} store={store} state={state}
              onDragStart={this.handleDragStart('demo1')} 
              onDragEnd={this.handleDragEnd('demo1')} 
            />
            <OneDemoView 
              innerRef={this.divGetter('demo2Height')} {...Todo2CountDemo} store={store} state={state}
              onDragStart={this.handleDragStart('demo2')} 
              onDragEnd={this.handleDragEnd('demo2')}
            />
            <OneDemoView 
              innerRef={this.divGetter('demo3Height')} {...Todo3CountDemo} store={store} state={state}
              onDragStart={this.handleDragStart('demo3')} 
              onDragEnd={this.handleDragEnd('demo3')}
             />
             <OneDemoView 
              innerRef={this.divGetter('demo4Height')} {...Todo4CountDemo} store={store} state={state}
              onDragStart={this.handleDragStart('demo4')} 
              onDragEnd={this.handleDragEnd('demo4')}
             />
            <NewButton ref={(ref) => this.buttons = ref} sizes={sizes} store={store}/>
          </div>
        );
    }
  }
}