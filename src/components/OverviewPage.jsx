'use strict';

import React from 'react';
import moment from 'moment';
import {Link} from 'react-router';
import axios from 'axios';
import ReactTable from 'react-table';
import {  VictoryChart,
          VictoryStack,
          VictoryArea,
          VictoryZoomContainer,
          VictoryTooltip,
          VictoryGroup,
          VictoryPie,
          VictoryPortal,
          VictoryScatter
       } from 'victory';

function convertMeasure(measure, from_unit, to_unit) {
  const factors = {
    y: -24,
    z: -21,
    a: -16,
    f: -15,
    p: -12,
    n: -9,
    µ: -6,
    m: -3,
    c: -2,
    d: -1,
    '': 0,
    da: 1,
    h: 2,
    k: 3,
    M: 6,
    G: 9,
    T: 12,
    P: 15,
    E: 18,
    Z: 21,
    Y: 24
  }
  if (from_unit && from_unit.length > 1) {
    from_unit = from_unit.substring(0,1);
    from_unit = from_unit.toLowerCase();
  }
  else {
    from_unit = '';
  }
  if (to_unit && to_unit.length > 1) {
    to_unit = to_unit.substring(0,1);
    to_unit = to_unit.toLowerCase();
  }
  else {
    to_unit = '';
  }
  let conversion = factors[from_unit]-factors[to_unit];
  console.log(conversion, from_unit, to_unit);
  return measure*Math.pow(10, conversion);
}

const transaction_columns = [
  {
    Header: 'Date',
    accessor: 'date',
    Cell: props => <span><a href={"/edit/"+props.original.id}>{new Date(props.value).toLocaleString()}</a></span>
  },
  {
    Header: 'Store',
    id: 'party_name',
    accessor: d => d.party.name
  },
  {
    Header: 'Total Price',
    accessor: 'total_price'
  }
]

const item_columns = [
  {
    Header: 'Name',
    accessor: d => d.product.name,
    id: 'product_name'
  },
  {
    Header: 'Quantity',
    id: 'quantity'
  },
  {
    Header: 'Measure',
    id: 'measure'
  },
  {
    Header: 'Category',
    accessor: d => d.product.category && d.product.category.name['fi-FI'],
    id: 'category_name',
    Cell: props => props.value ? <span><a href={"/category/"+props.original.product.category.id}>{props.value}</a></span> : <span></span>
  },
  {
    Header: 'Price',
    id: 'price',
    accessor: d => {
      let currency = localStorage.getItem('currency');
      console.log(currency, d);
      return d.price;
    }
  },
  {
    Header: 'Price/Measure',
    id: 'pricepermeasure',
    accessor: d => {
      return d.measure ? d.price/convertMeasure(d.measure, d.unit, 'kg') : null;
    }
  }
]

export default class ReceiptList extends React.Component {
  constructor(props) {
    super(props);

    let that = this;

    this.onDepthChange = this.onDepthChange.bind(this);

    this.state = {
      depth: 5,
      ready: false,
      resolved_pie_items: [],
      resolved_stack_items: []
    };

    axios.get('/api/attribute/')
    .then(function(attributes) {
      that.setState({attributes: attributes.data});
      axios.get('/api/transaction/')
      .then(function(response) {
        that.setState({
          transactions: response.data
        });
        axios.get('/api/item/')
        .then(response => {
          that.setState({items: response.data});
          that.resolvePieItems();
          that.resolveStackItems();
        })
        .catch(function(error) {
          console.error(error);
        });
      })
      .catch(function(error) {
        console.error(error);
      });
    })
    .catch(function(error) {
      console.error(error);
    });
  }
  handleZoom(domain) {
    this.setState({selectedDomain: domain});
  }

  handleBrush(domain) {
    this.setState({zoomDomain: domain});
  }
  onDepthChange(event) {
    this.setState({
      depth: event.target.value
    });
    this.resolvePieItems();
    this.resolveStackItems();
  }
  resolvePieItems() {
    let that = this,
        found, id, name,
        resolved_items = [];
    that.state.items.map(item => {
      id = false;
      if (that.state.depth > 2) {
        let current_depth, child = false;
        if (item.product.category) {
          //child = item.product.category;
          if (item.product.category.parent) {
            current_depth = that.state.depth-2;
            child = item.product.category.parent;
            while (current_depth > 0) {
              if (child && child.parent) {
                child = child.parent;
                current_depth-= 1;
              }
              else {
                //child = false;
                break;
              }
            }
          }
        }
        if (child) {
          id = 'c'+child.id;
          name = child.name;
        }
      }
      if ((!id || that.state.depth == 2) && item.product.category && item.product.category.parent) {
        id = 'c'+item.product.category.parent.id;
        name = item.product.category.parent.name;
      }
      if ((!id || that.state.depth == 1) && item.product.category) {
        id = 'c'+item.product.category.id;
        name = item.product.category.name;
      }
      if (that.state.depth == 0) {
        id = 'p'+item.product.id;
        name = item.product.name;
      }
      if (id === false) {
        id = 0;
        name = 'Uncategorized';
      }
      // if item is already in resolved items then sum to price
      found = false;
      resolved_items.map(resolved_item => {
        if (resolved_item.id === id) {
          resolved_item.price+= item.price;
          resolved_item.item_names.push(item.product.name);
          found = true;
          return;
        }
      });
      if (!found) {
        resolved_items.push({
          id: id,
          name: name.hasOwnProperty('fi-FI') ? name['fi-FI'] : name,
          price: item.price,
          item_names: [item.product.name]
        });
      }
    });
    console.log(resolved_items);
    that.setState({
      resolved_pie_items: resolved_items,
      ready: true
    });
  }
  resolveStackItems() {
    let that = this,
        index, found, id, name,
        indexed_items = [0],
        resolved_items = [];
    that.state.items.map(item => {
      id = false;
      if (that.state.depth > 2) {
        let current_depth, child = false;
        if (item.product.category) {
          //child = item.product.category;
          if (item.product.category.parent) {
            current_depth = that.state.depth-2;
            child = item.product.category.parent;
            while (current_depth > 0) {
              if (child && child.parent) {
                child = child.parent;
                current_depth-= 1;
              }
              else {
                //child = false;
                break;
              }
            }
          }
        }
        if (child) {
          id = 'c'+child.id;
          name = child.name;
        }
      }
      if ((!id || that.state.depth == 2) && item.product.category && item.product.category.parent) {
        id = 'c'+item.product.category.parent.id;
        name = item.product.category.parent.name;
      }
      if ((!id || that.state.depth == 1) && item.product.category) {
        id = 'c'+item.product.category.id;
        name = item.product.category.name;
      }
      if (that.state.depth == 0) {
        id = 'p'+item.product.id;
        name = item.product.name;
      }
      if (id === false) {
        id = 0;
        name = 'Uncategorized';
      }
      // if item is already in resolved items then sum to price
      found = false;
      resolved_items.map(resolved_item => {
        if (resolved_item.id === id) {
          resolved_item.data.map(data => {
            if (data.transaction_id === item.transaction.id) {
              data.price+= item.price;
              data.name = name.hasOwnProperty('fi-FI') ? name['fi-FI'] : name;
              data.item_names.push(item.product.name);
              found = true;
              return;
            }
          });
          if (!found) {
            resolved_item.data.push({
              transaction_id: item.transaction.id,
              name: name.hasOwnProperty('fi-FI') ? name['fi-FI'] : name,
              date: item.transaction.date,
              price: item.price,
              item_names: [item.product.name]
            });
          }
          found = true;
          return;
        }
      });
      // otherwise check indexed items
      if (!found) {
        index = indexed_items.indexOf(id);
        if (index === -1) {
          indexed_items.push(id);
          index = indexed_items.length-1;
        }
        resolved_items[index] = {
          id: id,
          data: [{
            transaction_id: item.transaction.id,
            date: item.transaction.date,
            name: name.hasOwnProperty('fi-FI') ? name['fi-FI'] : name,
            price: item.price,
            item_names: [item.product.name]
          }]
        }
      }
    });
    console.log(resolved_items);
    that.setState({
      resolved_stack_items: resolved_items,
      ready: true
    });
  }
  render() {
    if (!this.state.ready) {
      return <div/>
    }
    else
    return (
      <div>
        <div>
          <input type="range" min="0" max="5" step="1" onChange={this.onDepthChange.bind(this)}/>
          <VictoryChart
            scale={{ x: "time" }}
          >
            <VictoryStack
              colorScale="warm"
            >
            {this.state.resolved_stack_items.map(item => {
              return <VictoryGroup
                data={item.data}
                x={d => moment(d.date).toDate()}
                y="price"
              >
                <VictoryArea
                  name={item.data[0].name}
                />
                <VictoryScatter
                  labels={item.data[0].name}
                  style={{ data: { fill: "black" } }}
                  labelComponent={<VictoryTooltip renderInPortal/>}
                />
              </VictoryGroup>
            })}
          </VictoryStack>
        </VictoryChart>
        <VictoryPie
          colorScale="warm"
          data={this.state.resolved_pie_items}
          x="name"
          y="price"
        />
        </div>
        <div>
          <ReactTable
            data={this.state.transactions}
            columns={transaction_columns}
            pageSize={this.state.transactions ? this.state.transactions.length : 1}
            showPagination={false}
            SubComponent={row => {
              return (
                <ReactTable
                  data={this.state.transactions[row.index].items}
                  pageSize={this.state.transactions[row.index].items ? this.state.transactions[row.index].items.length : 1}
                  showPagination={false}
                  columns={item_columns}
                  />
              );
            }}
          />
        </div>
      </div>
    );
  }
}