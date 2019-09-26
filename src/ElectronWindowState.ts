"use strict";

import { BrowserWindow, Rectangle } from "electron";

let electron = require("electron");
let deepEqual = require("deep-equal");

const isInteger = (Number as any).isInteger;
const eventHandlingDelay = 100;

function isNumber(num: any) {
  return typeof typeof num === "number" && !isNaN(num);
}

type OnSave = (state: any) => void;

export interface IWinState {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  useContentSize?: boolean;
  displayBounds?: Rectangle;
  isMaximized?: boolean;
  isFullScreen?: boolean;
}

interface IWinConfig {
  defaultWidth?: number;
  defaultHeight?: number;
  useContentSize?: boolean;
}

export default class ElectronWindowState {
  onSave: OnSave | null;
  state: IWinState = {};
  winRef: any;
  stateChangeTimer: any;

  constructor(config: any, state: any, onSave: OnSave | null) {
    this.onSave = onSave;
    this.stateChangeHandler = this.stateChangeHandler.bind(this);
    this.closeHandler = this.closeHandler.bind(this);
    this.closedHandler = this.closedHandler.bind(this);
    this.loadState(state, config || {});
  }

  loadState(state: IWinState, config: IWinConfig) {
    this.state = this.normState(state);
    // Check state validity
    this.validateState();
    // Set state fallback values
    this.state = (Object as any).assign(
      {
        width: config.defaultWidth || 800,
        height: config.defaultHeight || 600,
        useContentSize: config.useContentSize || false,
      },
      this.state
    );
  }

  normState(state: IWinState) {
    if (isNumber(state.x)) {
      state.x = Math.floor(state.x as number);
    }
    if (isNumber(state.y)) {
      state.y = Math.floor(state.y as number);
    }
    if (isNumber(state.width)) {
      state.width = Math.floor(state.width as number);
    }
    if (isNumber(state.height)) {
      state.height = Math.floor(state.height as number);
    }
    return state;
  }

  isNormal(win: BrowserWindow) {
    return !win.isMaximized() && !win.isMinimized() && !win.isFullScreen();
  }

  hasBounds() {
    let state = this.state;
    return (
      state &&
      isInteger(state.x) &&
      isInteger(state.y) &&
      isInteger(state.width) &&
      (state.width as number) > 0 &&
      isInteger(state.height) &&
      (state.height as number) > 0
    );
  }

  validateState() {
    let state = this.state;
    if (state && (state.isMaximized || state.isFullScreen)) {
      return;
    }

    if (this.hasBounds() && state.displayBounds) {
      // Check if the display where the window was last open is still available
      let displayBounds = electron.screen.getDisplayMatching(state as Rectangle).bounds;
      let sameBounds = deepEqual(state.displayBounds, displayBounds, { strict: true });
      if (!sameBounds) {
        if (displayBounds.width < state.displayBounds.width) {
          if ((state.x as number) > displayBounds.width) {
            state.x = 0;
          }

          if ((state.width as number) > displayBounds.width) {
            state.width = displayBounds.width;
          }
        }

        if (displayBounds.height < state.displayBounds.height) {
          if ((state.y as number) > displayBounds.height) {
            state.y = 0;
          }

          if ((state.height as number) > displayBounds.height) {
            state.height = displayBounds.height;
          }
        }
      }
    }
  }

  updateState() {
    let state = this.state;
    let win = this.winRef;
    if (!win) {
      return;
    }
    // don't throw an error when window was closed
    try {
      let winBounds = state.useContentSize ? win.getContentBounds() : win.getBounds();
      if (this.isNormal(win)) {
        state.x = winBounds.x;
        state.y = winBounds.y;
        state.width = winBounds.width;
        state.height = winBounds.height;
      }
      state.isMaximized = win.isMaximized();
      state.isFullScreen = win.isFullScreen();
      state.displayBounds = electron.screen.getDisplayMatching(winBounds).bounds;
    } catch (err) {
      console.error(err);
    }
  }

  stateChangeHandler() {
    // Handles both 'resize' and 'move'
    clearTimeout(this.stateChangeTimer);
    this.stateChangeTimer = setTimeout(() => this.updateState(), eventHandlingDelay);
  }

  closeHandler() {
    this.updateState();
  }

  closedHandler() {
    // Unregister listeners and save state
    this.unmanage();
    this.updateState();
    this.onSave && this.onSave(this.state);
  }

  manage(win: BrowserWindow) {
    let state = this.state;
    if (state.isMaximized) {
      win.maximize();
    }
    if (state.isFullScreen) {
      win.setFullScreen(true);
    }
    win.on("resize", this.stateChangeHandler);
    win.on("move", this.stateChangeHandler);
    win.on("close", this.closeHandler);
    win.on("closed", this.closedHandler);
    this.winRef = win;
  }

  unmanage() {
    let winRef = this.winRef;
    if (winRef) {
      winRef.removeListener("resize", this.stateChangeHandler);
      winRef.removeListener("move", this.stateChangeHandler);
      clearTimeout(this.stateChangeTimer);
      winRef.removeListener("close", this.closeHandler);
      winRef.removeListener("closed", this.closedHandler);
      this.winRef = null;
    }
  }
}
