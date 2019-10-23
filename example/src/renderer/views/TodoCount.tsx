import * as React from "react";
import Button from "@material-ui/core/Button";
import { withStyles } from "@material-ui/core/styles";
import { withEventFlux, Filter } from "react-event-flux";

const styles = theme => ({
  root: {
    "& > *": {
      margin: theme.spacing.unit,
    },
  },
});

class CounterDemo extends React.Component<any, any> {
  constructor(props) {
    super(props);
    this.state = {};
  }

  onClick5 = () => {
    this.props.store.stores.todoStore.getObject().then(obj => {
      console.log("return obj", obj);
      this.setState({ retObj: obj.clientId });
    });
  };

  onClick6 = () => {
    this.props.store.stores.todoStore.getObjectThrow().catch(err => {
      console.log("catch obj", err);
      this.setState({ retErr: err.message });
    });
  };

  onClick7 = () => {
    this.props.store.stores.todoStore.getAsyncObject().then(obj => {
      console.log("return obj", obj);
      this.setState({ asyncObj: obj.clientId });
    });
  };

  render() {
    let { todo4, todo, todoStore, todo4Store, classes } = this.props;
    if (todo == null || todo4 == null) {
      return null;
    }
    let { count, isComplete } = todo;
    let { todo4Map, todo4List } = todo4;
    const onClick = () => todoStore.addTodo(1);
    const onClick2 = () => todoStore.setComplete(isComplete ? undefined : true);
    const onClick3 = () => todoStore.todo2Store.todo4Store.addKey(Math.random().toString(), 0);
    const onClick4 = () => todoStore.todo2Store.todo4Store.increase();
    return (
      <div className={classes.root}>
        <Button color="primary" variant="contained" onClick={onClick}>
          INCREMENT {count}
        </Button>
        <Button color="primary" variant="contained" onClick={onClick2}>
          Complete {isComplete ? "Yes" : "No"}
        </Button>
        <Button color="primary" variant="contained" onClick={onClick3}>
          Immutable Map {todo4Map && todo4Map.size}
        </Button>
        <Button color="primary" variant="contained" onClick={onClick4}>
          Immutable List {todo4List && todo4List.size}
        </Button>
        <Button color="primary" variant="contained" onClick={this.onClick5}>
          Return Value {this.state.retObj}
        </Button>
        <Button color="primary" variant="contained" onClick={this.onClick6}>
          Error {this.state.retErr}
        </Button>
        <Button color="primary" variant="contained" onClick={this.onClick7}>
          Async Return {this.state.asyncObj}
        </Button>
      </div>
    );
  }
}

const eventFluxArgs = {
  todoStore: Filter.FA,
  todo4Store: Filter.FA,
};

export default {
  title: "Todo Count Demo",
  Component: withEventFlux(eventFluxArgs)(withStyles(styles)(CounterDemo)),
};
