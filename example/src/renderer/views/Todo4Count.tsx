import * as React from 'react';
import Button from '@material-ui/core/Button';
import { withStyles } from '@material-ui/core/styles';

const styles = theme => ({
  root: {
    '& > *': {
      margin: theme.spacing.unit,
    }
  },
});

function Todo4Demo({ state, store, classes }) {
  let count = state.renderTodo.count;
  const onClick = () => store.stores.renderTodoStore.addTodo(2);
  const onClick2 = () => store.stores.renderTodoStore.decreaseTodo(2);
  return (
    <div className={classes.root}>
      <Button color="primary" variant="contained" onClick={onClick}>Add Size {count}</Button>
      <Button color="primary" variant="contained" onClick={onClick2}>Decrease Size {count}</Button>
    </div>
  );
}

export default {
  title: 'Todo4 Renderer process Local embed Count Demo',
  Component: withStyles(styles)(Todo4Demo),
};