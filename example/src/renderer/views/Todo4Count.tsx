import * as React from "react";
import Button from "@material-ui/core/Button";
import { withStyles } from "@material-ui/core/styles";
import { Filter, withEventFlux } from "react-event-flux";

const styles = theme => ({
  root: {
    "& > *": {
      margin: theme.spacing.unit,
    },
  },
});

function Todo4Demo({ rendererTodo, rendererTodoStore, classes }) {
  if (!rendererTodoStore) {
    return null;
  }
  let count = rendererTodo.count;
  const onClick = () => rendererTodoStore.addTodo(1);
  const onClick2 = () => rendererTodoStore.decreaseTodo(1);
  return (
    <div className={classes.root}>
      <Button color="primary" variant="contained" onClick={onClick}>
        Add Size {count}
      </Button>
      <Button color="primary" variant="contained" onClick={onClick2}>
        Decrease Size {count}
      </Button>
    </div>
  );
}

const eventFluxArgs = {
  rendererTodoStore: Filter.FA,
};

export default {
  title: "Renderer process Local embed Count Demo",
  Component: withEventFlux(eventFluxArgs)(withStyles(styles)(Todo4Demo)),
};
