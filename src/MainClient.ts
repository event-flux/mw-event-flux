export default typeof window !== "object"
  ? require("./ElectronMainClient").default
  : require("./browser/BrowserMainClient").default;
