import { EventEmitter } from "events";

class FakeWebContents {
  _isDestroyed: boolean = false;
  _isCrashed: boolean = false;
  channels: any[] = [];

  isDestroyed() {
    return this._isDestroyed;
  }

  isCrashed() {
    return this._isCrashed;
  }

  send(channel: string, ...args: any[]) {
    this.channels.push([channel, ...args]);
  }
}

class FakeBrowserWindow extends EventEmitter {
  props: any;
  url: any;
  webContents: FakeWebContents;
  _isMinimized = false;
  _isMaximized = false;
  _isFullScreen = false;
  _bounds: Rectangle = { x: 0, y: 0, width: 100, height: 100 };
  _contentBounds: Rectangle = { x: 0, y: 0, width: 100, height: 100 };

  constructor(props: any) {
    super();
    this.props = props;
    this.webContents = new FakeWebContents();
  }

  loadURL(url: any) {
    this.url = url;
  }

  show() {
    this.props.show = true;
  }

  maximize() {
    this._isMaximized = true;
  }

  unmaximize() {
    this._isMaximized = false;
  }

  isMaximized() {
    return this._isMaximized;
  }

  minimize() {
    this._isMinimized = true;
  }

  restore() {
    this._isMinimized = false;
  }

  isMinimized() {
    return this._isMinimized;
  }

  setFullScreen(flag: boolean) {
    this._isFullScreen = flag;
  }

  isFullScreen() {
    return this._isFullScreen;
  }

  setBounds(bounds: Rectangle) {
    this._bounds = bounds;
    this.emit("resize", {});
  }

  getBounds() {
    return this._bounds;
  }

  setContentBounds(bounds: Rectangle) {
    this._contentBounds = bounds;
    this.emit("resize", {});
  }

  getContentBounds() {
    return this._contentBounds;
  }

  close() {
    this.emit("close", {});
    this.emit("closed", {});
  }
}

interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const ipcMain = new EventEmitter();
export const ipcRenderer = new EventEmitter();

export const BrowserWindow = FakeBrowserWindow;
export const screen = {
  getDisplayMatching(rect: Rectangle) {
    return {
      bounds: { x: 0, y: 0, width: 1200, height: 800 } as Rectangle,
    };
  },
};

export const Event = function() {};
export const WebContents = FakeWebContents;
