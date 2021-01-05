'use strict';

import axios from 'axios';
import moment from 'moment';
import React, { Component } from 'react';
import {Link} from 'react-router-dom';
import {
  VictoryChart,
  VictoryZoomContainer,
  VictoryBrushContainer,
  VictoryLine,
  VictoryTooltip,
  VictoryBar
} from 'victory';
import AsteriskTable from 'react-asterisk-table';
import sortable from 'react-asterisk-table/lib/Sortable';
import tree from 'react-asterisk-table/lib/Tree';

import { locale } from './locale';
import { aggregateCategoryAttribute, aggregateCategoryPrice, getAverageRate } from '../utils/categories';
import { getItemNameByDepth } from '../utils/items';

import './OverviewPage.scss';

function first(list) {
  for (let i in list) {
    return list[i];
  }
}

moment.locale(locale.getLanguage());

const currencyFormat = new Intl.NumberFormat(locale.getLocale(), { style: 'currency', currency: locale.getCurrency() });

const TreeTable = sortable(tree(AsteriskTable));

export default class OverviewPage extends Component {
  constructor(props) {
    super(props);

    this.onDepthChange = this.onDepthChange.bind(this);

    this.state = {
      filter: {}, 
      depth: 1,
      ready: false,
      attribute_aggregates: {},
      transaction_aggregates: {monthly:[]},
      resolved_pie_items: [],
      resolved_stack_items: [],
      resolved_timeline_items: [],
      resolved_timeline_categories: []
    };

    this.setAttributeAggregateVisibility = this.setAttributeAggregateVisibility.bind(this);
    this.setFilter = this.setFilter.bind(this);
    this.setAverageRange = this.setAverageRange.bind(this);
  }
  async componentDidMount() {
    try {
      const attributes = await axios.get('/api/attribute/?parent')
      this.setState({attributes: attributes.data});

      const transactions = await axios.get('/api/transaction/');
      this.setState({
        transactions: transactions.data
      }, async () => {
        this.setMaximumRangeFilter();
        this.setState({
          transaction_aggregates: this.aggregateTransactions()
        });
        const items = await axios.get('/api/item/');
        this.setState({items: items.data});
        
        const categories = await axios.get('/api/category/?parent&locale='+locale.getLocale())

        this.setState({
          categories: [...categories.data],
          resolved_categories: [...categories.data],
          columns: this.getColumns(),
          attribute_columns: this.getAttributeColumns()
        }, () => {
          this.resolvePieItems();
          this.resolveStackItems();
          
          let resolvedCategories = this.state.resolved_categories;
    
          const attributeAggregates = this.state.attribute_aggregates;
          const averageRate = getAverageRate(this.state.filter, this.state.average_range);
          
          resolvedCategories = aggregateCategoryAttribute(resolvedCategories, attributeAggregates, averageRate);
          resolvedCategories = aggregateCategoryPrice(resolvedCategories, averageRate);

          this.setState({
            columns: this.getColumns(),
            resolved_categories: resolvedCategories
          });

          document.title = "Categories";

          this.setState({
            ready: true
          });
        });
      });
    } catch (error) {
      console.error(error);
    }
  }
  handleZoom(domain) {
    this.setState({selectedDomain: domain});
  }

  handleBrush(domain) {
    this.setState({zoomDomain: domain});
  }
  filterCategories(categories, start_date, end_date) {
    const {transactions} = this.state;
    return categories.forEach(category => {
      category.products.forEach(product => {
        product.items = product.items.filter(item => {
          const has_items_within_limits = transactions.some(transaction => {
            const item_found = transaction.items.some(transaction_item => transaction_item.id === item.id);
            const is_after = (!start_date || moment(transaction.date).toDate() >= moment(start_date).toDate());
            const is_before = (!end_date || moment(transaction.date).toDate() <= moment(end_date).toDate());
            return item_found && is_after && is_before;
          });
          return has_items_within_limits;
        })
      });
      this.filterCategories(category.children, start_date, end_date);
    });
  }
  setMaximumRangeFilter() {
    return new Promise((resolve) => {
      const {transactions} = this.state;
      let {start_date, end_date} = {...this.state.filter};
      let minimum, maximum;
      if (!start_date || !end_date) {
        console.log('!!!', transactions);
        transactions.forEach(transaction => {
          let transaction_date = moment(transaction.date).toDate();
          if (!minimum || transaction_date < minimum) minimum = transaction_date;
          if (!maximum || transaction_date > maximum) maximum = transaction_date;
        });
        if (!start_date) start_date = moment(minimum).format('YYYY-MM-DD');
        if (!end_date) end_date = moment(maximum).format('YYYY-MM-DD');
      }
      this.setState({filter: {start_date, end_date}}, () => {
        resolve();
      });
    });
  }
  setAverageRange(average_range) {
    this.setState({average_range}, () => {
      let resolvedCategories = this.state.resolved_categories;
    
      const attributeAggregates = this.state.attribute_aggregates;
      const averageRate = getAverageRate(this.state.filter, this.state.average_range);
          
      resolvedCategories = aggregateCategoryAttribute(resolvedCategories, attributeAggregates, averageRate);
      resolvedCategories = aggregateCategoryPrice(resolvedCategories, averageRate);

      this.setState({
        columns: this.getColumns(),
        resolved_categories: resolvedCategories
      });
    });
  }
  setFilter(parameter, value) {
    let resolved_categories = _.cloneDeep(this.state.categories),
        {start_date, end_date} = {...this.state.filter};
        
    if (parameter === 'start_date') start_date = value;
    if (parameter === 'end_date') end_date = value;

    this.filterCategories(resolved_categories, start_date, end_date);

    this.setState({
      filter: {
        ...this.state.filter,
        [parameter]: value
      },
      resolved_categories
    }, () => {
      console.log(this.state);
      this.setMaximumRangeFilter().then(() => {
        let resolvedCategories = this.state.resolved_categories;
    
        const attributeAggregates = this.state.attribute_aggregates;
        const averageRate = getAverageRate(this.state.filter, this.state.average_range);
          
        resolvedCategories = aggregateCategoryAttribute(resolvedCategories, attributeAggregates, averageRate);
        resolvedCategories = aggregateCategoryPrice(resolvedCategories, averageRate);

        this.setState({
          columns: this.getColumns(),
          resolved_categories: resolvedCategories
        });
      });
    });
  }
  onDepthChange(event) {
    this.setState({
      depth: event.target.value
    });
    this.resolvePieItems();
    this.resolveStackItems();
    this.resolveTimelineItems();
  }
  aggregateTransactions() {
    let date,
        aggregates = {
      monthly: {}
    };
    const {attribute_aggregates} = this.state;
    this.state.transactions.map(transaction => {
      date = moment(transaction.date, 'YYYY-MM-01').format();
      Object.entries(attribute_aggregates).forEach(([id, attribute]) => {
        transaction.items.forEach(item => {
          const item_attribute = item.product.category.attributes.find(attribute => attribute.id === id);
        })
      });
      if (aggregates.monthly.hasOwnProperty(date)) {
        aggregates.monthly[date].total_price+= transaction.total_price;
      }
      else {
        aggregates.monthly[date] = {
          date: date,
          goal: 100,
          total_price: transaction.total_price
        }
      }
    });
    aggregates.monthly = Object.values(aggregates.monthly);
    return aggregates;
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
          name: locale.getNameLocale(name),
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
    let index, found, id, name,
        indexed_items = [0],
        resolved_items = [],
        values;
    this.state.items.forEach(item => {
      if (!item || !item.product) {
        return true;
      }
      values = getItemNameByDepth(item, this.state.depth);
      id = values.id;
      name = values.name;
      // if item is already in resolved items then sum to price
      found = false;
      resolved_items.forEach(resolved_item => {
        if (!resolved_item || !resolved_item.product) {
          return true;
        }
        if (resolved_item.id === id) {
          resolved_item.data.forEach(data => {
            if (data.transaction_id === item.transaction.id) {
              data.price+= item.price;
              data.name = locale.getNamelocale(name);
              data.item_names.push(item.product.name);
              found = true;
              return;
            }
          });
          if (!found) {
            resolved_item.data.push({
              transaction_id: item.transaction.id,
              name: locale.getNameLocale(name),
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
            name: locale.getNameLocale(name),
            price: item.price,
            item_names: [item.product.name]
          }]
        }
      }
    });
    console.log(resolved_items);
    this.setState({
      resolved_stack_items: resolved_items
    });
  }
  getColumns() {
    let attribute_aggregate_columns = [],
        attribute_aggregates = Object.assign({}, this.state.attribute_aggregates),
        aggregate;
    for (let id in attribute_aggregates) {
      aggregate = attribute_aggregates[id];
      if (aggregate && !aggregate.children.length) {
        let label = locale.getNameLocale(aggregate.name)+(aggregate.unit ? " ("+aggregate.unit+")" : '');
        let target_unit = locale.getAttributeUnit(aggregate.name['en-US']);
        if (target_unit) {
          label = locale.getNameLocale(aggregate.name)+" ("+target_unit+")";
        }
        attribute_aggregate_columns.push({
          id: aggregate.name[locale.getLocale()]+'_sum',
          property: 'attribute_sum['+id+']',
          formatter: (value, item) => {
            return item.attribute_sum && 
                   item.attribute_sum[id] &&
                   item.attribute_sum[id].toLocaleString(locale.getLocale(), {minimumFractionDigits: 2,maximumFractionDigits:2});
          },
          label
        });
      }
    }
    return [
      {
        id: 'name',
        label: 'Name',
        property: item => locale.getNameLocale(item.name),
        formatter: (value, item) => <Link to={"/category/"+item.id}>{locale.getNameLocale(value)}</Link>,
        width: '700'
      },
      {
        id: 'price_sum',
        formatter: value => value && value.toFixed(2),
        label: 'Price'
      },
      {
        id: 'weight_sum',
        formatter: value => value && value.toFixed(2),
        label: 'Weight'
      },
      {
        id: 'volume_sum',
        formatter: value => value && value.toFixed(2),
        label: 'Volume'
      }
    ].concat(attribute_aggregate_columns);
  }
  getAttributeColumns() {
    return [
      {
        id: 'checkbox',
        label: <input type="checkbox"
                      id={"toggle-attribute-all"}
                      onChange={event => this.setAttributeAggregateVisibility(null, event.target.checked)}/>,
        formatter: (value, attribute) => <input type="checkbox"
                                                id={"toggle-attribute-"+attribute.id}
                                                checked={this.state.attribute_aggregates.hasOwnProperty(attribute.id)}
                                                onChange={event => this.setAttributeAggregateVisibility(attribute, event.target.checked)}/>
      },
      {
        id: 'name',
        label: 'Name',
        property: attribute => locale.getNameLocale(attribute.name),
        formatter: (value, attribute) => <label htmlFor={"toggle-attribute-"+attribute.id}>{locale.getNameLocale(value)}</label>
      }
    ]
  }
  setAttributeAggregateVisibility(attribute, visible) {
    function set(attribute, visible, attribute_aggregates) {
      attribute.children.forEach(child => {
        set(child, visible, attribute_aggregates);
      });
      if (visible) attribute_aggregates[attribute.id] = attribute;
      else delete attribute_aggregates[attribute.id];
    }
    let attribute_aggregates = {...this.state.attribute_aggregates};

    if (attribute) {
      set(attribute, visible, attribute_aggregates);
    }
    else {
      this.state.attributes.forEach(a => {
        set(a, visible, attribute_aggregates);
      });
    }
    
    this.setState({
      attribute_aggregates
    }, () => {
      let resolvedCategories = this.state.resolved_categories;
    
      const attributeAggregates = this.state.attribute_aggregates;
      const averageRate = getAverageRate(this.state.filter, this.state.average_range);
      
      resolvedCategories = aggregateCategoryAttribute(resolvedCategories, attributeAggregates, averageRate);
      resolvedCategories = aggregateCategoryPrice(resolvedCategories, averageRate);

      this.setState({
        columns: this.getColumns(),
        resolved_categories: resolvedCategories
      });
    });
  }
  render() {
    if (!this.state.ready) return null;
    return (
      <div className="overview-page__container">
        <div className="overview-page__content">
          <h2>Transactions</h2>
          <label>
            Start
            <input
              type="date"
              defaultValue={this.state.filter.start_date}
              onBlur={event => this.setFilter('start_date', event.target.value)}
            />
          </label>
          <label>
            End
            <input
              type="date"
              defaultValue={this.state.filter.end_date}
              onBlur={event => this.setFilter('end_date', event.target.value)}
            />
          </label>
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
            <VictoryLine
              data={this.state.transaction_aggregates.monthly}
              x={d => moment(d.date).toDate()}
              y="goal"
              style={{ data: { stroke: "red" } }}
              labels={d => d.datum.goal}
              labelComponent={<VictoryTooltip renderInPortal/>}
            />
            <VictoryBar
              data={this.state.transaction_aggregates.monthly}
              x={d => moment(d.date).toDate()}
              y="total_price"
              style={{ data: { fill: "navy", width: 10 } }}
              labels={d => moment(d.datum.date).format('MMM YYYY')+' '+currencyFormat.format(d.datum.total_price)}
              labelComponent={<VictoryTooltip renderInPortal/>}
            />
            <VictoryBar
              data={this.state.transactions}
              x={d => moment(d.date).toDate()}
              y="total_price"
              labels={d => moment(d.datum.date).format('LLL')+' '+currencyFormat.format(d.datum.total_price)}
              style={{ data: { fill: "seagreen", width: 10 } }}
              labelComponent={<VictoryTooltip renderInPortal/>}
            />
          </VictoryChart>
          <VictoryChart
            height={120}
            padding={{top: 0, left: 50, right: 50, bottom: 30}}
            scale={{x: "time"}}
            containerComponent={
              <VictoryBrushContainer
                brushDimension="x"
                brushDomain={this.state.selectedDomain}
                onBrushDomainChange={this.handleBrush.bind(this)}
              />
            }>
            <VictoryLine
              style={{
                data: {stroke: "tomato"}
              }}
              data={this.state.transaction_aggregates.monthly}
              x={d => moment(d.date).toDate()}
              y="total_price"
            />
          </VictoryChart>
          <h2>Categories</h2>
          <select
            value={this.state.average_range}
            onChange={event => this.setAverageRange(event.target.value)}>
            <option value="">All</option>
            <option value="365">Yearly average</option>
            <option value="30">Monthly average</option>
            <option value="7">Weekly average</option>
            <option value="1">Daily average</option>
          </select>
          <TreeTable
            columns={this.state.columns}
            items={this.state.resolved_categories}
            resolveItems={items => items.filter(item => item.price_sum > 0)}
          />
        </div>
        <div className="overview-page__options">
          <h3>Attributes</h3>
          <TreeTable
            columns={this.state.attribute_columns}
            items={this.state.attributes}
          />
        </div>
      </div>
    );
  }
}

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