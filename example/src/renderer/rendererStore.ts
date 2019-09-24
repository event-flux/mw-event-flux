import StoreBase from 'event-flux/lib/StoreBase';

export default class TodoStore extends StoreBase {
  constructor(arg) {
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