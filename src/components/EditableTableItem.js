import React, {Component} from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { DragSource, DropTarget } from 'react-dnd';
import _ from 'lodash';

/**
 * Implements the drag source contract.
 */
const itemSource = {
  beginDrag(props) {
    return {
      item: props.item,
      columns: props.columns,
      depth: props.depth
    };
  }
};

const itemTarget = {
	hover(props, monitor, component) {
		const dragIndex = monitor.getItem().index
    const hoverIndex = props.index

		// Don't replace items with themselves
		if (dragIndex === hoverIndex) {
			return
		}

		// Determine rectangle on screen
		const hoverBoundingRect = ReactDOM.findDOMNode(component).getBoundingClientRect()

		// Get vertical middle
		const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2

		// Determine mouse position
		const clientOffset = monitor.getClientOffset()

		// Get pixels to the top
		const hoverClientY = clientOffset.y - hoverBoundingRect.top

		// Only perform the move when the mouse has crossed half of the items height
		// When dragging downwards, only move when the cursor is below 50%
		// When dragging upwards, only move when the cursor is above 50%

		// Dragging downwards
		if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
			return
		}

		// Dragging upwards
		if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
			return
    }
    
		// Time to actually perform the action
		// props.moveCard(dragIndex, hoverIndex)

		// Note: we're mutating the monitor item here!
		// Generally it's better to avoid mutations,
		// but it's good here for the sake of performance
		// to avoid expensive index searches.
		monitor.getItem().index = hoverIndex
	},
}

const ItemTypes = {
  EDITABLETABLEITEM: 'editabletableitem'
}

class EditableTableItem extends Component {
  static propTypes() {
    return {
		connectDragSource: PropTypes.func.isRequired,
		connectDropTarget: PropTypes.func.isRequired,
		isDragging: PropTypes.bool.isRequired
  }}
  
  constructor(props) {
    super(props);
  }
  renderColumns(columns, indexes, tds) {
    const that = this;

    let value, content, key, hasChildren;
    
    if (columns && columns.length) {
      return columns.map((column, i) => {
        hasChildren = column.columns && column.columns.length;
        content = this.props.getContent(this.props.item, column);
        key = "td-row-"+that.props.item.id+"-column-"+i+(indexes.length ? "-"+indexes.join('-') : '');

        if (i == 0 && !indexes.length && (that.props.item.children || that.props.childView)) {
          tds.push(<td key={key}
                    className={column.class}
                    data-label={column.label}
                    style={{paddingLeft: that.props.depth+"em"}}>
                      {that.props.childView || that.props.item.children.length ?
                        [<a href="#"
                            onClick={event => that.props.toggleChildren(event, that.props.item.id)}
                            className="arrow">
                            {that.props.expanded_items[that.props.item.id] ? '\u25BE' : '\u25B8'}
                        </a>, '\u00A0'] : '\u00A0\u00A0'
                      }
                      {content}
                  </td>);
        }
        else {
          tds.push(<td className={(hasChildren ? 'parent-column': '')+(column.class ? ' '+column.class : '')}
                       data-label={column.label}
                       key={key}
                       style={hasChildren ? {display:'none'} : {}}>
                       {content}
                  </td>);
        }

        if (hasChildren) {
          that.renderColumns(column.columns, indexes.concat([i]), tds);
        }
      });
    }
  }

  render() {
    const that = this;
    const { isDragging, connectDragSource, connectDropTarget, columns, item } = this.props;

    let value, tds = [];

    that.renderColumns(that.props.columns, [], tds);

    let row = (
      <tr key={'tr-row-'+that.props.item.id}
          id={that.props.item.id}
          data-parent={that.props.parent}
          className={that.props.className}>
        {tds}
      </tr>
    );

    //row = connectDragSource(connectDropTarget(row));

    if (that.props.expanded_items[item.id] && that.props.item.children && that.props.item.children.length) {
      let children = that.props.resolveItems(that.props.item.children).map((item, i) => {
          if (that.props.filter && !that.props.filter(item)) return true;

          return <EditableTableItem
                    key={item.id}
                    parent={this.props.item.id}
                    className={(this.props.className ? this.props.className+" " : "")+this.props.item.id}
                    item={item}
                    columns={that.props.columns}
                    expanded_items={that.props.expanded_items}
                    resolveItems={that.props.resolveItems}
                    getContent={this.props.getContent}
                    filter={that.props.filter}
                    depth={that.props.depth+1}
                    connectDragSource={connectDragSource}
                    connectDropTarget={connectDropTarget}
                    isDragging={isDragging}
                    toggleChildren={that.props.toggleChildren}
                  />
          });
      return [row].concat(children);
    }
    else if (that.props.expanded_items[item.id] && that.props.childView) {
      return [
        row, 
        (<tr key={this.props.item.id+"-childView"} id={this.props.item.id+"-childView"}>
          <td colSpan={that.props.columns.length}>
            {that.props.childView(that.props.item, this.props.item.id)}
          </td>
        </tr>)
      ];
    }
    else {
      return row;
    }
  }
}

export default _.flow(
  DragSource(ItemTypes.EDITABLETABLEITEM, itemSource, (connect, monitor) => {
    return {
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging(),
  }}),
  DropTarget(ItemTypes.EDITABLETABLEITEM, itemTarget, connect => ({
    connectDropTarget: connect.dropTarget(),
  }))
 )(EditableTableItem);