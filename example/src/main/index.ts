"use strict";

import { app, BrowserWindow } from "electron";
import * as path from "path";
import { format as formatUrl } from "url";
import {
  todoStoreDeclarer,
  winTodoStoreDeclarer,
  simpleStoreDeclarer,
  simpleListDeclarer,
  simpleMapDeclarer,
  immutableStoreDeclarer,
} from "./store";
// import MultiWinStore from 'electron-event-flux/lib/MultiWinCacheStore';
// import buildMultiWinAppStore from 'electron-event-flux/lib/MainAppStore';
import MultiWinStore from "mw-event-flux/lib/electron/MultiWinCacheStore";
import MainAppStore from "mw-event-flux/lib/MainAppStore";
// import { winManagerStoreName } from '../../../src/constants';
// import ElectronWindowState from '../../../src/ElectronWindowState';
import storage from "./storage";
import { declareStore } from "event-flux";

const electron = require("electron");

const isDevelopment = process.env.NODE_ENV !== "production";

// global reference to mainWindow (necessary to prevent window from being garbage collected)

// class MyMultiWinStore extends MultiWinStore {
//   init() {
//     this.clientUrlMap = {};
//     this.clientStateMap = {};
//     this.clientIds = [];

//     let clients = storage.get('clients');
//     if (!clients || clients.length === 0) {
//       clients = [{ clientId: 'mainClient', url: '/', winState: { isMaximized: true } }];
//     }
//     app.on('ready', () => {
//       clients.forEach(item => this.createElectronWin(item.url, item.clientId, item.winState));
//     });
//   }

//   closeAllWindows() {
//     global.appStore.mainClient.closeAllWindows();
//   }

//   saveClients(clientIds) {
//     let clients = clientIds.map(id => ({
//       clientId: id, url: this.clientUrlMap[id], winState: this.clientStateMap[id],
//     }));
//     storage.set('clients', clients);
//   }

//   saveWinState(clientId, winState) {
//     this.clientStateMap[clientId] = winState;
//     this.saveClients(this.clientIds || []);
//   }

//   createElectronWin(url, clientId, params) {
//     let winState = new ElectronWindowState(null, params);

//     let winInfo = createElectronWin(url, clientId, winState.state);
//     if (!clientId) clientId = winInfo.clientId;
//     this.clientIds.push(clientId);

//     this.clientUrlMap[clientId] = url;

//     let win = winInfo.win;

//     winState.onSave = (state) => {
//       this.saveWinState(clientId, state);
//     };
//     this.clientStateMap[clientId] = winState.state;
//     winState.manage(win);

//     this.saveClients(this.clientIds);   // Save clients into Storage

//     win.on('closed', () => {
//       if (this.willQuit) return;
//       if (clientId === 'mainClient') {
//         this.willQuit = true;
//         return this.closeAllWindows();
//       }
//       let index = this.clientIds.indexOf(clientId);
//       if (index !== -1) {
//         this.clientIds.splice(index, 1);
//       }
//       this.saveClients(this.clientIds);
//     });
//     return win;
//   }
// }

class MyMultiWinStore extends MultiWinStore {
  getStorage() {
    return storage;
  }
}

let appStore = new MainAppStore([
  todoStoreDeclarer,
  winTodoStoreDeclarer,
  simpleStoreDeclarer,
  simpleListDeclarer,
  simpleMapDeclarer,
  immutableStoreDeclarer,
  declareStore(MyMultiWinStore, { lifetime: "static", storeKey: "multiWinStore" }),
]).init();

// let mainWindow;

// quit application when all windows are closed
app.on("window-all-closed", () => {
  // on macOS it is common for applications to stay open until the user explicitly quits
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// app.on('activate', () => {
//   // on macOS it is common to re-create a window even after all windows have been closed
//   if (mainWindow === null) {
//     mainWindow = createMainWindow()
//   }
// })

// create main BrowserWindow when electron is ready
// app.on('ready', () => {
//   // mainWindow = createMainWindow()
//   createElectronWin(null, 'mainWin');
// })
