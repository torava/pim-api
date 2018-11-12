import React, {Component} from 'react';
import ReactDOM from 'react-dom';
import { default as TouchBackend } from 'react-dnd-html5-backend';
import { DragDropContext } from 'react-dnd';
import EditableTableItem from './EditableTableItem';

class EditableTable extends Component {
  constructor(props) {
    super(props);

    this.state = {
      columns: props.columns,
      childView: props.childView,
      items: props.items,
      resolved_items: props.items,
      filter: props.filter,
      column_orders: {},
      ready: false
    }

    this.toggleChildren = this.toggleChildren.bind(this);
    this.onColumnTitleClick = this.onColumnTitleClick.bind(this);
  }
  componentWillReceiveProps(props) {
    this.setState({
      columns: props.columns,
      childView: props.childView,
      items: props.items,
      ready: false
    });
  }
  toggleChildren(event) {
    event.preventDefault();

    const indexes = event.target.parentNode.parentNode.id.split('-'),
          items = [...this.state.items];

    let item = items[indexes.shift()];

    for (let i in indexes) {
      item = item.children[indexes[i]];
    }

    item.expanded = !item.expanded;

    this.setState({
      items
    });
  }
  onColumnTitleClick(column, event) {
    let column_orders = Object.assign({}, this.state.column_orders),
        that = this;
    if (column.sortable !== false) {
      if (column_orders[column.id] == 'ASC') {
        column_orders[column.id] = 'DESC';
      }
      else if (column_orders[column.id] == 'DESC') {
        delete column_orders[column.id];
      }
      else {
        column_orders[column.id] = 'ASC';
      }
    }
    console.log(column, column.sortable !== false, column_orders);
    this.setState({
      column_orders
    }, () => {
      this.setState({
        resolved_items: that.resolveItems(that.state.items),
        ready: true
      })
    });
  }
  getColumnChildren(column) {
    if (column.columns) {
      let children = this.getColumnChildren(column.columns);
      if (children && children.length) {
        return [column].concat(children);
      }
    }
    else return column;
  }
  resolveItems(items) {
    console.log(this);
    if (!items) return [];

    let resolved_items = [...items],
        column_orders = this.state.column_orders,
        column_order,
        order;
    resolved_items.sort((a,b) => {
      for (let id in column_orders) {
        if (!a.hasOwnProperty(id) || !b.hasOwnProperty(id)) return;
        if (typeof a == 'string' && typeof b == 'string') {
          order = a[id].localeCompare(b[id], undefined, {numeric: true, sensitivity: 'base'});
        }
        else {
          order = a < b;
        }
        column_order = column_orders[id];
        console.log(order, column_orders[id], id);
        if (column_order === 'ASC') {
          return order;
        }
        else if (column_order === 'DESC') {
          return !order;
        }
      }
    });
    console.log(column_orders);
    return resolved_items;
  }
  renderColumns(column, indexes, content, total, depth, cols) {
    let count,
        that = this,
        count2 = 0,
        rowspan,
        key;
    depth++;
    column && column.map((column, i) => {
      key = "column-"+indexes.join('-')+"-"+i;
      count = 0;
      rowspan = 1;
      if (column.columns) {
        count = Math.max(that.renderColumns(column.columns, indexes.concat(i), content, total, depth, cols), column.columns.length);
      }
      else {
        rowspan = 2+depth;
        cols.push(<col style={column.style}/>);
      }
      if (!content[depth-1]) content[depth-1] = [];
      content[depth-1].push(
        <th colSpan={count || 1}
            rowSpan={rowspan}
            data-depth={depth}
            key={key}
            onClick={this.onColumnTitleClick.bind(this, column)}>
          {column.label} {{'ASC': '\u25B4', 'DESC': '\u25BE'}[this.state.column_orders[column.id]] || ''}
        </th>
      );
      count2+= count;
    });
    return count2;
  }
  render() {
    let that = this,
        cols = [],
        col_index = 0,
        content = [],
        total = 0;

    that.renderColumns(that.state.columns, [], content, total, 0, cols);
    let thead = <thead>
                  {content.map((row, i) => {
                    return <tr key={"row"+i}>{row}</tr>
                  })}
                </thead>;

    return (
      <table border="1" {...that.props.tableProps}>
        <colgroup>
          {cols}
        </colgroup>
        {thead}
        <tbody>
          {that.state.resolved_items && that.state.resolved_items.map((item, i) => {
            if (that.state.filter && !that.state.filter(item)) return true;

            return <EditableTableItem
                    key={i}
                    rowIndex={i}
                    item={item}
                    filter={that.state.filter}
                    columns={that.state.columns}
                    resolveItems={that.resolveItems.bind(that)}
                    depth={0}
                    toggleChildren={that.toggleChildren}
                    childView={that.state.childView}
                  />
          })}
        </tbody>
      </table>
    );
  }
}

export default DragDropContext(TouchBackend)(EditableTable);