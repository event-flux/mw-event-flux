export default (window as any).process
  ? require("./ElectronRendererClient").default
  : require("./browser/BrowserRendererClient").default;
