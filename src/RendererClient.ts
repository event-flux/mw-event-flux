export default (window as any).process
  ? require("./electron/ElectronRendererClient").default
  : require("./browser/BrowserRendererClient").default;
