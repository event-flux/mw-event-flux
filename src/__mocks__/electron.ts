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
}

export const ipcMain = new EventEmitter();
export const BrowserWindow = FakeBrowserWindow;
export const Event = function() {};
export const WebContents = FakeWebContents;
