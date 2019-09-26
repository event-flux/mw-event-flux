import StoreBase, { IS_STORE } from "./StoreBase";
import stateFilterDecorator from "./utils/stateFilterDecorator";

export default stateFilterDecorator(StoreBase);
