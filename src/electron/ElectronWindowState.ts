import { BrowserWindow, Rectangle, screen } from "electron";

const eventHandlingDelay = 100;

function isNumber(num: any) {
  return typeof num === "number" && !isNaN(num);
}

type OnSave = (state: any) => void;

export interface IWinState {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  useContentSize?: boolean;
  isMaximized?: boolean;
  isFullScreen?: boolean;
}

interface IWinConfig {
  defaultX?: number;
  defaultY?: number;
  defaultWidth?: number;
  defaultHeight?: number;
  useContentSize?: boolean;
}

export default class ElectronWindowState {
  onSave: OnSave | null;
  state: IWinState = {};
  winRef: any;
  stateChangeTimer: any;

  constructor(config: any, state: IWinState, onSave: OnSave | null) {
    this.onSave = onSave;
    this.stateChangeHandler = this.stateChangeHandler.bind(this);
    this.closeHandler = this.closeHandler.bind(this);
    this.closedHandler = this.closedHandler.bind(this);
    this.loadState(state, config || {});
  }

  loadState(state: IWinState, config: IWinConfig) {
    this.state = state;
    this.normState(this.state, config);
    // Check state validity
    this.validateState(this.state);
  }

  normState(state: IWinState, config: IWinConfig) {
    if (!isNumber(state.x)) {
      state.x = config.defaultX || 0;
    }
    state.x = Math.floor(state.x as number);

    if (!isNumber(state.y)) {
      state.y = config.defaultY || 0;
    }
    state.y = Math.floor(state.y as number);

    if (!isNumber(state.width)) {
      state.width = config.defaultWidth || 800;
    }
    state.width = Math.floor(state.width as number);

    if (!isNumber(state.height)) {
      state.height = config.defaultHeight || 600;
    }
    state.height = Math.floor(state.height as number);

    if (state.useContentSize == null) {
      state.useContentSize = config.useContentSize || false;
    }
  }

  isNormal(win: BrowserWindow) {
    return !win.isMaximized() && !win.isMinimized() && !win.isFullScreen();
  }

  validateState(state: IWinState) {
    // Get the display where the window was last open
    let displayBounds = screen.getDisplayMatching(state as Rectangle).bounds;
    if (
      state.y! >= displayBounds.y &&
      state.y! + state.height! <= displayBounds.y + displayBounds.height &&
      state.x! >= displayBounds.x &&
      state.x! + state.width! <= displayBounds.x + displayBounds.width
    ) {
      return;
    }
    state.width = Math.min(displayBounds.width, state.width!);
    state.height = Math.min(displayBounds.height, state.height!);
    state.x = Math.floor(displayBounds.x + (displayBounds.width - state.width) / 2);
    state.y = Math.floor(displayBounds.y + (displayBounds.height - state.height) / 2);
  }

  updateState() {
    let state = this.state;
    let win = this.winRef;
    // don't throw an error when window was closed
    try {
      if (this.isNormal(win)) {
        let winBounds = state.useContentSize ? win.getContentBounds() : win.getBounds();
        state.x = winBounds.x;
        state.y = winBounds.y;
        state.width = winBounds.width;
        state.height = winBounds.height;
      }
      state.isMaximized = win.isMaximized();
      state.isFullScreen = win.isFullScreen();
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
