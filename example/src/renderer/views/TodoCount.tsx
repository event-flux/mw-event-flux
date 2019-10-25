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
    this.props.todoStore.getObject().then(obj => {
      console.log("return obj", obj);
      this.setState({ retObj: obj.clientId });
    });
  };

  onClick6 = () => {
    this.props.todoStore.getObjectThrow().catch(err => {
      console.log("catch obj", err);
      this.setState({ retErr: err.message });
    });
  };

  onClick7 = () => {
    this.props.todoStore.getAsyncObject().then(obj => {
      console.log("return obj", obj);
      this.setState({ asyncObj: obj.clientId });
    });
  };

  render() {
    let { immutable, todo, todoStore, immutableStore, classes } = this.props;
    if (todo == null || immutable == null) {
      return null;
    }
    let { count, isComplete } = todo;
    let { immutableMap, immutableList } = immutable;
    const onClick = () => todoStore.addTodo(1);
    const onClick2 = () => todoStore.setComplete(isComplete ? undefined : true);
    const onClick3 = () => immutableStore.addKey(Math.random().toString(), 0);
    const onClick4 = () => immutableStore.increase();
    return (
      <div className={classes.root}>
        <Button color="primary" variant="contained" onClick={onClick}>
          INCREMENT {count}
        </Button>
        <Button color="primary" variant="contained" onClick={onClick2}>
          Complete {isComplete ? "Yes" : "No"}
        </Button>
        <Button color="primary" variant="contained" onClick={onClick3}>
          Immutable Map {immutableMap && immutableMap.size}
        </Button>
        <Button color="primary" variant="contained" onClick={onClick4}>
          Immutable List {immutableList && immutableList.size}
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
  immutableStore: Filter.FA,
};

export default {
  title: "Todo Count Demo",
  Component: withEventFlux(eventFluxArgs)(withStyles(styles)(CounterDemo)),
};
