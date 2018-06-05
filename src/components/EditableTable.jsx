import React, {Component} from 'react';
import { default as TouchBackend } from 'react-dnd-html5-backend';
import { DragDropContext } from 'react-dnd';
import EditableTableItem from './EditableTableItem';

class EditableTable extends Component {
  constructor(props) {
    super(props);

    this.state = {
      columns: props.columns,
      childView: props.childView,
      items: props.items
    }

    this.toggleChildren = this.toggleChildren.bind(this);
  }
  componentWillReceiveProps(props) {
    this.setState({
      columns: props.columns,
      childView: props.childView,
      items: props.items
    });
  }
  toggleChildren(event) {
    event.preventDefault();

    const indexes = event.target.parentNode.parentNode.id.split('-'),
        items = this.state.items;

    let item = items[indexes.shift()];

    for (let i in indexes) {
      item = item.children[indexes[i]];
    }

    item.expanded = !item.expanded;

    this.setState({
      items
    });

    /*let items = this.state.items;
    items[i].expanded = !items[i].expanded;
    this.setState({items: items});*/
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
  renderColumns(column, indexes, content, total, depth, cols) {
    let count, that = this, count2 = 0, rowspan;
    depth++;
    column && column.map((column, i) => {
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
            key={"column-"+indexes.join('-')+"-"+i}>
          {column.label} {{'ASC': '\u25B4', 'DESC': '\u25BE'}[column.order] || ''}
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
          {that.state.items && that.state.items.map((item, i) => {
            return <EditableTableItem
                    key={i}
                    rowIndex={i}
                    item={item}
                    columns={that.state.columns}
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

module.exports = DragDropContext(TouchBackend)(EditableTable);