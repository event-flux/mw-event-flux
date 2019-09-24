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

class CounterDemo extends React.Component<any, any> {
  constructor(props) {
    super(props);
    this.state = {};
  }

  onClick5() {
    this.props.store.stores.todoStore.getObject().then(obj => {
      console.log('return obj', obj);
      this.setState({ retObj: obj.clientId })
    });
  }

  onClick6() {
    this.props.store.stores.todoStore.getObjectThrow().catch(err => {
      console.log('catch obj', err);
      this.setState({ retErr: err.message })
    });
  } 

  onClick7() {
    this.props.store.stores.todoStore.getAsyncObject().then(obj => {
      console.log('return obj', obj);
      this.setState({ asyncObj: obj.clientId })
    });
  }

  render() {
    let { state, store, classes } = this.props;
    if (!state.todo) return null;
    let { count, isComplete } = state.todo;
    let { todo4Map, todo4List } = state.todo.todo2.todo4;
    const onClick = () => store.stores.todoStore.addTodo(1);
    const onClick2 = () => store.stores.todoStore.setComplete(isComplete ? undefined : true);
    const onClick3 = () => store.stores.todoStore.todo2Store.todo4Store.addKey(Math.random().toString(), 0);
    const onClick4 = () => store.stores.todoStore.todo2Store.todo4Store.increase();
    const onClickAction = () => store.stores.actionRecordStore.setAction('/Hello');
    return (
      <div className={classes.root}>
        <Button color="primary" variant="contained" onClick={onClick}>INCREMENT {count}</Button>
        <Button color="primary" variant="contained" onClick={onClick2}>Complete {isComplete ? 'Yes' : 'No'}</Button>
        <Button color="primary" variant="contained" onClick={onClick3}>Immutable Map {todo4Map && todo4Map.size}</Button>
        <Button color="primary" variant="contained" onClick={onClick4}>Immutable List {todo4List && todo4List.size}</Button>
        <Button color="primary" variant="contained" onClick={this.onClick5.bind(this)}>Return Value {this.state.retObj}</Button>
        <Button color="primary" variant="contained" onClick={this.onClick6.bind(this)}>Error {this.state.retErr}</Button>
        <Button color="primary" variant="contained" onClick={this.onClick7.bind(this)}>Async Return {this.state.asyncObj}</Button>
        <Button color="primary" variant="contained" onClick={onClickAction}>Change Action</Button>
      </div>
    );
  }
}

export default {
  title: 'Todo Count Demo',
  Component: withStyles(styles)(CounterDemo),
};