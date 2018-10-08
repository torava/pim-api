'use strict';

import axios from 'axios';
import moment from 'moment';
import React, {Component} from 'react';
import EditableTable from './EditableTable';
import {  VictoryChart,
  VictoryStack,
  VictoryArea,
  VictoryZoomContainer,
  VictoryTooltip,
  VictoryGroup,
  VictoryPie,
  VictoryPortal,
  VictoryLine,
  VictoryBar,
  VictoryScatter
} from 'victory';

class OverviewPage extends Component {
  constructor(props) {
    super(props);

    let that = this;

    this.onDepthChange = this.onDepthChange.bind(this);

    this.state = {
      depth: 1,
      ready: false,
      attribute_aggregates: {},
      resolved_pie_items: [],
      resolved_stack_items: [],
      resolved_timeline_items: [],
      resolved_timeline_categories: []
    };

    axios.get('/api/attribute/?parent')
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
          axios.get('/api/category/?transactions&locale=fi-FI')
          .then(function(response) {
            that.setState({
              categories: [...response.data],
              resolved_categories: [...response.data],
              columns: that.getColumns(),
              attribute_columns: that.getAttributeColumns()
            }, () => {
              that.resolvePieItems();
              that.resolveStackItems();
              that.aggregateCategoryPrice();

              document.title = "Categories";

              that.setState({
                ready: true
              });
            });
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
    this.resolveTimelineItems();
  }
  getItemNameByDepth(item, depth) {
    let name,
        id = false;
    if (!item || !item.product) {
      id = 0;
      name = 'Uncategorized';
      return {id, name};
    }
    if (depth > 2) {
      let current_depth, child = false;
      if (item.product.category) {
        //child = item.product.category;
        if (item.product.category.parent) {
          current_depth = depth-2;
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
    if ((!id || depth == 2) && item.product.category && item.product.category.parent) {
      id = 'c'+item.product.category.parent.id;
      name = item.product.category.parent.name;
    }
    if ((!id || depth == 1) && item.product.category) {
      id = 'c'+item.product.category.id;
      name = item.product.category.name;
    }
    if (depth == 0) {
      id = 'p'+item.product.id;
      name = item.product.name;
    }
    if (id === false) {
      id = 0;
      name = 'Uncategorized';
    }
    return {id, name};
  }
  resolvePieItems() {
    let that = this,
        found, id, name,
        resolved_items = [];
    that.state.items.map(item => {
      id = false;
      if (!item || !item.product) {
        return true;
      }
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
      resolved_pie_items: resolved_items
    });
  }
  resolveStackItems() {
    let that = this,
        index, found, id, name,
        indexed_items = [0],
        resolved_items = [],
        values;
    that.state.items.map(item => {
      values = that.getItemNameByDepth(item, that.state.depth);
      id = values.id;
      name = values.name;
      // if item is already in resolved items then sum to price
      found = false;
      resolved_items.map(resolved_item => {
        if (!resolved_item || !resolved_item.product) {
          return true;
        }
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
      resolved_stack_items: resolved_items
    });
  }
  aggregateCategoryPrice() {
    let categories = [...this.state.categories];
    categories.reduce(function resolver(sum, category) {
      if (category.hasOwnProperty('products') && category.products.length) {
        let item_prices = 0;
        category.products.map(product => {
          product.items.map(item => {
            item_prices+= item.price;
          });
        });
        category.price_sum = item_prices; 
      }
      if (category.hasOwnProperty('children') && category.children.length) {
        category.price_sum = category.children.reduce(resolver, 0);
      }
      return sum+(category.price_sum || 0);
    }, 0);
    console.log(categories);
    this.setState({
      resolved_categories: categories
    });
  }
  aggregateCategoryAttribute() {
    let categories = [...this.state.resolved_categories],
        attribute_aggregates = this.state.attribute_aggregates;
    for (let attribute_id in attribute_aggregates) {
      categories.reduce(function resolver(sum, category) {
        let item_measure = 0;
        if (category.hasOwnProperty('products') && category.products.length) {
          category.products.map(product => {
            product.items.map(item => {
              item_measure+= (item.quantity || 1)*(item.measure/100);
            });
          });
        }
        if (category.attributes.hasOwnProperty(attribute_id)) {
          if (!category.hasOwnProperty('attribute_sum')) {
            category.attribute_sum = {};
          }
          category.attribute_sum[attribute_id] = category.attributes[attribute_id].value*item_measure; 
        }
        if (category.hasOwnProperty('children') && category.children.length) {
          if (!category.hasOwnProperty('attribute_sum')) {
            category.attribute_sum = {};
          }
          category.attribute_sum[attribute_id] = category.children.reduce(resolver, 0);
        }
        return sum+(category.attribute_sum && category.attribute_sum[attribute_id] || 0);
      }, 0);
    }
    this.setState({
      resolved_categories: categories
    });
  }
  getColumns() {
    let attribute_aggregate_columns = [],
        attribute_aggregates = Object.assign({}, this.state.attribute_aggregates),
        aggregate;
    for (let id in attribute_aggregates) {
      aggregate = attribute_aggregates[id];
      aggregate && attribute_aggregate_columns.push({
        id: aggregate.name['fi-FI']+'_sum',
        formatter: (value, item) => {
          console.log(id);
          return item.attribute_sum && item.attribute_sum[id] && item.attribute_sum[id].toLocaleString('fi-FI', {minimumFractionDigits: 2,maximumFractionDigits:2});
        },
        label: aggregate.name['fi-FI']+(aggregate.unit && " ("+aggregate.unit+")")
      });
    }
    return [
      {
        id: 'name',
        label: 'Name',
        property: 'name',
        formatter: (value, item) => <a href={"/category/"+item.id}>{value}</a>,
        width: '700'
      },
      {
        id: 'price_sum',
        formatter: value => value && value.toLocaleString('fi-FI', {style: 'currency', currency: 'EUR'}),
        label: 'Price'
      }
    ].concat(attribute_aggregate_columns);
  }
  getAttributeColumns() {
    return [
      {
        formatter: (value, attribute) => <input type="checkbox" name={attribute.id} onChange={this.setAttributeAggregateVisibility.bind(this, attribute)}/>
      },
      {
        id: 'name',
        label: 'Name',
        formatter: (value, attribute) => <label for={"toggle-attribute-"+attribute.id}>{value['fi-FI']}</label>
      }
    ]
  }
  setAttributeAggregateVisibility(attribute, event) {
    let attribute_aggregates = Object.assign({}, this.state.attribute_aggregates),
        that = this;
    if (event.target.value === 'on') {
      attribute_aggregates[attribute.id] = attribute;
    }
    else {
      attribute_aggregates[attribute.id] = false;
    }
    this.setState({
      attribute_aggregates
    }, () => {
      that.setState({
        columns: that.getColumns()
      });
      that.aggregateCategoryPrice();
      that.aggregateCategoryAttribute();
    });
  }
  render() {
    if (!this.state.ready) return null;
    return (
      <div>
        <h2>Transactions</h2>
        <VictoryChart
          scale={{ x: "time" }}
          crossAxis={true}
          containerComponent={
            <VictoryZoomContainer
              zoomDimension="x"
              zoomDomain={this.state.zoomDomain}
              onZoomDomainChange={this.handleZoom.bind(this)}
            />
          }
        >
          <VictoryGroup
            data={this.state.transactions}
            x={d => moment(d.date).toDate()}
            y="total_price"
          >
            <VictoryLine/>
            <VictoryScatter
              labels={d => moment(d.date).toDate().toLocaleDateString('fi-FI')+" "+moment(d.date).toDate().toLocaleTimeString('fi-FI')+", "+(d.party && d.party.name)+": "+d.total_price}
              style={{ data: { fill: "black" } }}
              labelComponent={<VictoryTooltip renderInPortal/>}
            />
          </VictoryGroup>
        </VictoryChart>  
        <h2>Categories</h2>
        <EditableTable
          columns={this.state.columns}
          items={this.state.resolved_categories}
        />
        <h2>Attributes</h2>
        <EditableTable
          columns={this.state.attribute_columns}
          items={this.state.attributes}
        />
      </div>
    );
  }
}

module.exports = OverviewPage;

/*
<VictoryChart
          style={{parent:{ width: '70em', height:'100em', overflow: 'scroll' }}}
        >
          <VictoryBar horizontal
            colorScale="warm"
            sortOrder="descending"
            sortKey="price"
            data={this.state.resolved_pie_items}
            x="name"
            y="price"
          />
        </VictoryChart>*/