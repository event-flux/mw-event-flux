import { declareStore, StoreBase } from "event-flux";

class TodoStore extends StoreBase<any> {
  constructor() {
    super();
    this.state = { count: 0 };
  }

  addTodo(num) {
    this.setState({ count: this.state.count + num });
  }

  decreaseTodo(num) {
    this.setState({ count: this.state.count - num });
  }
}

export default declareStore(TodoStore, { storeKey: "rendererTodoStore", stateKey: "rendererTodo" });
