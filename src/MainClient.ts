export default typeof window !== "object"
  ? require("./electron/ElectronMainClient").default
  : require("./browser/BrowserMainClient").default;
