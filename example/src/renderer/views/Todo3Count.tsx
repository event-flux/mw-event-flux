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

function Todo2Demo({ winTodo, winTodoStore, classes }) {
  if (!winTodo) {
    return null;
  }
  let { count } = winTodo;
  const onClick = () => winTodoStore.addTodo(1);
  const onClick2 = () => winTodoStore.decreaseTodo(1);
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
  winTodoStore: Filter.FA,
};

export default {
  title: "Window Local embed Count Demo",
  Component: withEventFlux(eventFluxArgs)(withStyles(styles)(Todo2Demo)),
};
