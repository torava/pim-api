import React, { Component } from 'react';
import axios from 'axios';
import moment from 'moment';

import { locale } from '../locale';
import { getItemNameByDepth } from '../../utils/items';
import Transactions from './Transactions';
import Attributes from '../shared/Attributes';
import Categories from './Categories';
import TimeFilter from './TimeFilter';
import { convertMeasure } from '../../utils/entities';
import { SelectedAttribute } from '../shared/SelectedAttribute';
import { AttributeGoals } from '../shared/AttributeGoals';

import './OverviewPage.scss';

function first(list) {
  for (let i in list) {
    return list[i];
  }
}

moment.locale(locale.getLanguage());

const initialAttributes = [{id: -1, name: 'Price', children: [], unit: '€'}];

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
      resolved_timeline_categories: [],
      attributeGoals: {
        [-1]: 100
      },
      selectedAttribute: initialAttributes[0],
      aggregateAttributes: {}
    };

    this.setFilter = this.setFilter.bind(this);
    this.setAverageRange = this.setAverageRange.bind(this);
    this.setAttributeAggregates = this.setAttributeAggregates.bind(this);
    this.setSelectedAttribute = this.setSelectedAttribute.bind(this);
    this.setAttributeGoals = this.setAttributeGoals.bind(this);
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
        this.aggregateTransactionPrice();
        const items = await axios.get('/api/item/');
        this.setState({items: items.data});
        
        const categories = await axios.get('/api/category/?parent&locale='+locale.getLocale())

        this.setState({
          categories: [...categories.data],
          resolved_categories: [...categories.data]
        }, () => {
          this.resolvePieItems();
          this.resolveStackItems();

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
    this.setState({average_range});
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
      this.setMaximumRangeFilter();
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
  aggregateTransactionPrice() {
    let date,
        aggregates = {
      monthly: {}
    };
    const transactions = this.state.transactions.map(transaction => {
      date = moment(transaction.date, 'YYYY-MM-01').format();

      const aggregate = aggregates.monthly[date] || {};
      const aggregateAttributes = aggregate.attributes || {};

      aggregateAttributes[-1] = transaction.total_price+(aggregateAttributes[-1] || 0);

      const transactionAttributes = {
        ...transaction.attributes || {},
        [-1]: transaction.total_price
      };

      aggregates.monthly[date] = {
        date: date,
        attributes: aggregateAttributes
      };

      return {
        ...transaction,
        attributes: transactionAttributes
      };
    });

    this.setState({
      transactions,
      transaction_aggregates: aggregates
    });
  }
  aggregateTransactionAttribute(selectedAttribute) {
    const {aggregateAttributes} = this.state;

    if (selectedAttribute.id > 0 && !aggregateAttributes[selectedAttribute]) {
      let date,
          aggregates = {...this.state.transaction_aggregates};
      const transactions = this.state.transactions.map(transaction => {
        let attributeValue = 0;

        date = moment(transaction.date, 'YYYY-MM-01').format();

        const aggregate = aggregates.monthly[date] || {};
        const aggregateAttributes = aggregate.attributes || {};

        transaction.items.forEach(item => {
          const itemAttribute = item.product?.category?.attributes?.find(attribute => attribute.attributeId === selectedAttribute.id);
          const measure = convertMeasure(item.product?.measure || item.measure, item.product?.unit || item.unit, 'kg');
          const itemMeasure = (item.product?.quantity || item.quantity || 1)*measure || 0;
          attributeValue+= (itemAttribute?.value || 0)*itemMeasure;
        });
        aggregateAttributes[selectedAttribute.id] = attributeValue+(aggregateAttributes[selectedAttribute.id] || 0);

        const previousAttributes = transaction.attributes || {};
        const transactionAttributes = {
          ...previousAttributes,
          [selectedAttribute.id]: attributeValue
        };

        aggregates.monthly[date] = {
          date: date,
          attributes: aggregateAttributes
        };

        return {
          ...transaction,
          attributes: transactionAttributes
        };
      });

      return {
        transactions,
        transaction_aggregates: aggregates,
        aggregateAttributes: {
          ...aggregateAttributes,
          [selectedAttribute.id]: true
        }
      };
    }
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
  setAttributeAggregates(attribute_aggregates) {
    this.setState({
      attribute_aggregates
    });
  }
  setSelectedAttribute(selectedAttribute) {
    this.setState({
      ...this.aggregateTransactionAttribute(selectedAttribute) || {},
      selectedAttribute
    });
  }
  setAttributeGoals(attributeGoals) {
    this.setState({attributeGoals});
  }
  render() {
    const {
      ready,
      attributes,
      transactions,
      transaction_aggregates,
      attribute_aggregates,
      resolved_categories,
      filter,
      average_range,
      selectedAttribute,
      attributeGoals
    } = this.state;

    if (!ready) return null;

    return (
      <div className="overview-page__container">
        <div className="overview-page__content">
          <h2>Transactions</h2>
          <Transactions
            attributes={attributes}
            transactions={transactions}
            transactionAggregates={transaction_aggregates}
            selectedAttribute={selectedAttribute}
            attributeGoals={attributeGoals}/>
          <h2>Categories</h2>
          <Categories
            categories={resolved_categories}
            attributeAggregates={attribute_aggregates}
            filter={filter}
            averageRange={average_range}/>
        </div>
        <div className="overview-page__options">
          <h3>Time</h3>
          <TimeFilter
            filter={filter}
            setFilter={this.setFilter}/>
          <h3>Attributes</h3>
          <Attributes
            attributes={[...initialAttributes, ...attributes]}
            attributeAggregates={attribute_aggregates}
            setAttributeAggregates={this.setAttributeAggregates}
            selectedAttribute={selectedAttribute}
            setSelectedAttribute={this.setSelectedAttribute}/>
          <SelectedAttribute
            selectedAttribute={selectedAttribute}/>
          <AttributeGoals
            attributeGoals={attributeGoals}
            setAttributeGoals={this.setAttributeGoals}
            selectedAttribute={selectedAttribute}/>
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