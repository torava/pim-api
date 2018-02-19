import React, {Component} from 'react';
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
    
    console.log(dragIndex, hoverIndex);    

		// Don't replace items with themselves
		if (dragIndex === hoverIndex) {
			return
		}

		// Determine rectangle on screen
		const hoverBoundingRect = findDOMNode(component).getBoundingClientRect()

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
    this.toggleChildren = this.toggleChildren.bind(this);
  }
  toggleChildren(event) {
    let children = document.getElementsByClassName(this.props.rowIndex),
        arrow = event.target.getElementsByClassName('arrow')[0],
        expanded = arrow.innerHTML === '\u25B8',
        children_class = (this.props.className ? this.props.className+" " : "")+this.props.rowIndex,
        child_parent_expanded;
    arrow.innerHTML = expanded ? '\u25BE' : '\u25B8';
    event.target.setAttribute('expanded', expanded);
    for (let i in children) {
      if (expanded) { // closing
        child_parent_expanded = children[i].parentNode.getAttribute('data-expanded');
        if (child_parent_expanded) {
          children[i].style.display = 'table-row';
        }
        else {
          children[i].style.display = 'none';
        }
      }
      else if (children[i].className === children_class) { // opening
        children[i].style.display = expanded ? 'none' : 'table-row';
      }
    }
  }

  renderColumn(column, i, n) {
    let that = this,
        value = _.get(that.props.item, column.property || column.id),
        key = "row-"+that.props.rowIndex+"-column-"+i;
    if (typeof n != 'undefined') {
      key+= "-"+n;
    }
    if (i == 0) {
      return <td key={key}
                 onClick={that.toggleChildren.bind(this)}
                 style={{"padding-left":(that.props.depth)+"em"}}>
                   <span className="arrow">&#x25B8;</span>&nbsp;
                   {value}
              </td>
    }
    else {
      return <td key={key}>
                {value}
              </td>
    }
  }

  render() {
    const that = this;
    const { isDragging, connectDragSource, connectDropTarget, columns, item } = this.props;

    let value;

    let row = (
      <tr key={that.props.rowIndex} className={that.props.className} style={that.props.rowIndex ? {display:'none'} : {}}>
        {that.props.columns.map((column, i) => {
          if (column.columns && column.columns.length) {
            return column.columns.map((child, n) => {
              return that.renderColumn(child, i, n);
            });
          }
          else {
            return that.renderColumn(column, i);
          }
        })}
      </tr>
    );

    let children = that.props.item.children && that.props.item.children.map((item, i) => {
          return <EditableTableItem
                    rowIndex={this.props.rowIndex+"-"+i}
                    className={(this.props.className ? this.props.className+" " : "")+this.props.rowIndex}
                    item={item}
                    columns={that.props.columns}
                    depth={that.props.depth+1}
                    connectDragSource={connectDragSource}
                    connectDropTarget={connectDropTarget}
                    isDragging={isDragging}
                  />
          });

    let content = [connectDragSource(connectDropTarget(row))].concat(children);
    
    if (that.props.depth == 0) {
      return <tbody>
                {content}
              </tbody>;
    }
    else {
      return content;
    }
  }
}

module.exports = _.flow(
  DragSource(ItemTypes.EDITABLETABLEITEM, itemSource, (connect, monitor) => {
    return {
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging(),
  }}),
  DropTarget(ItemTypes.EDITABLETABLEITEM, itemTarget, connect => ({
    connectDropTarget: connect.dropTarget(),
  }))
 )(EditableTableItem);