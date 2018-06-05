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
    /*let children = document.getElementsByClassName(this.props.rowIndex),
        arrow = event.target.getElementsByClassName('arrow')[0],
        expanded = arrow.innerHTML === '\u25BE',
        children_class = (this.props.className ? this.props.className+" " : "")+this.props.rowIndex,
        child_parent_expanded;
    arrow.innerHTML = expanded ? '\u25B8' : '\u25BE';
    event.target.parentNode.setAttribute('data-expanded', !expanded);
    for (let i = 0; i < children.length; i++) {
      if (!expanded) { // opening
        child_parent_expanded = document.getElementById(children[i].getAttribute('data-parent')).getAttribute('data-expanded');
        if (child_parent_expanded) {
          children[i].style.display = 'table-row';
        }
        else {
          children[i].style.display = 'none';
        }
      }
      else { // closing
        children[i].style.display = 'none';
      }
    }*/
  }
  toggleChildView(event) {
    let childView = document.getElementById(this.props.rowIndex+"-childView");
    if (childView) {
      childView.style.display = childView.style.display == 'none' ? 'block' : 'none';
    }
  }
  renderColumns(columns, indexes, tds) {
    const that = this;

    let value, content, key, hasChildren;
    
    if (columns && columns.length) {
      return columns.map((column, i) => {
        hasChildren = column.columns && column.columns.length;
        value = _.get(that.props.item, column.property || column.id),
        content = column.formatter && column.formatter(value, that.props.item, that.props.rowIndex) || value,
        key = "row-"+that.props.rowIndex+"-column-"+i+"-"+indexes.join('-');

        if (i == 0 && !indexes.length && (that.props.item.children || that.props.childView)) {
          tds.push(<td key={key}
                    data-label={column.label}
                    style={{paddingLeft: that.props.depth+"em"}}>
                      {that.props.childView || that.props.item.children.length ?
                        [<a href="#" onClick={that.props.toggleChildren}
                            className="arrow">
                            {that.props.item.expanded ? '\u25BE' : '\u25B8'}
                        </a>, '\u00A0'] : ''
                      }
                      {content}
                  </td>);
        }
        else {
          tds.push(<td className={hasChildren ? 'parent-column' : ''}
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
      <tr key={that.props.rowIndex} id={that.props.rowIndex} data-parent={that.props.parent} className={that.props.className}>
        {tds}
      </tr>
    );

    //row = connectDragSource(connectDropTarget(row));

    if (that.props.item.expanded && that.props.item.children && that.props.item.children.length) {
      let children = that.props.item.children.map((item, i) => {
          return <EditableTableItem
                    rowIndex={this.props.rowIndex+"-"+i}
                    parent={this.props.rowIndex}
                    className={(this.props.className ? this.props.className+" " : "")+this.props.rowIndex}
                    item={item}
                    columns={that.props.columns}
                    expanded={that.props.item}
                    depth={that.props.depth+1}
                    connectDragSource={connectDragSource}
                    connectDropTarget={connectDropTarget}
                    isDragging={isDragging}
                    toggleChildren={that.props.toggleChildren}
                  />
          });
      return [row].concat(children);
    }
    else if (that.props.item.expanded && that.props.childView) {
      return [
        row, 
        (<tr key={this.props.rowIndex+"-childView"} id={this.props.rowIndex+"-childView"}>
          <td colSpan={that.props.columns.length}>
            {that.props.childView(that.props.item, this.props.rowIndex)}
          </td>
        </tr>)
      ];
    }
    else {
      return row;
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