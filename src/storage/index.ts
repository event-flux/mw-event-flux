export default typeof window === "object" ? require("./LocalStore").default : require("./ElectronStore").default;
