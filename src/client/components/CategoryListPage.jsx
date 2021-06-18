import React, {Component} from 'react';
import AsteriskTable from 'react-asterisk-table';
import tree from 'react-asterisk-table/lib/Tree';
import sortable from 'react-asterisk-table/lib/Sortable';

import { locale } from './locale';
import DataStore from './DataStore';
import { getAttributeColumns } from '../utils/ui';
import { first, measureRegExp } from '../../utils/entities';

const TreeTable = sortable(tree(AsteriskTable));

const getTranslation = (name) => {
  let translation = '';
  if (typeof name === 'object') {
    translation = name[locale.getLocale()] || name['en-US'] || first(name);
  } else if (typeof name === 'string') {
    translation = name;
  }
  return translation;
};

export default class CategoryList extends Component {
  constructor(props) {
    super(props);

    this.state = {
      searchCategoryName: '',
      categories: [],
      resolvedCategories: [],
      attributes: [],
      products: [],
      measureAndUnit: undefined,
      measure: undefined,
      unit: undefined,
      price: undefined
    };

    this.searchTimeout;

    Promise.all([
      DataStore.getAttributes(),
      DataStore.getCategories(),
      DataStore.getProducts()
    ])
    .then(([attributes, categories, products]) => {
      let categoriesAndProducts = [
        ...categories,
        ...products.map(p => ({...p, id: -p.id, isProduct: true, parentId: p.categoryId}))
      ];
      this.setState({
        categories: categoriesAndProducts,
        resolvedCategories: categoriesAndProducts,
        attributes
      });
    })
    .catch(error => {
      console.error(error);
    });

    this.selectCategory = this.selectCategory.bind(this);
    this.setSearchCategoryName = this.setSearchCategoryName.bind(this);
  }
  getColumns() {
    const {
      categories,
      measure,
      unit,
      price
    } = this.state;

    const {
      selectedAttributes,
      attributeUnits
    } = this.props;

    return [
      {
        id: 'name',
        label: 'Name',
        property: 'name',
        formatter: (name, item) => {
          const translation = getTranslation(name);
          let content = translation;
          const searchCategoryName = this.state.searchCategoryName || '';
          if (searchCategoryName.length) {
            const index = translation?.toLowerCase().indexOf(searchCategoryName.toLowerCase());
            if (index !== -1) {
              content = <>
                {translation.slice(0, index)}
                <b>{translation.slice(index, index+searchCategoryName.length)}</b>
                {translation.slice(index+searchCategoryName.length)}
              </>;
            }
          }
          if (item.isProduct) {
            return content;
          } else {
            return <a href={`/category/${item.id}`}>
              {content}
            </a>;
          }
        },
        width: '700'
      },
      {
        id: 'price',
        label: 'Price'
      },
    ].concat(getAttributeColumns(selectedAttributes, categories, attributeUnits, measure, unit, price));
  }
  selectCategory(category, selected) {
    let selected_categories = {...this.state.selected_categories};
    if (selected) {
      selected_categories[category.id] = true;
    }
    else {
      delete selected_categories[category.id];
    }
    this.setState({selected_categories});
  }
  setSearchCategoryName(searchCategoryName) {
    this.setState({
      searchCategoryName
    });
    window.clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      if (searchCategoryName !== '') {
        const resolvedCategories = this.state.categories.filter(category => (
          getTranslation(category.name).toLowerCase().indexOf(searchCategoryName?.toLowerCase()) !== -1
        )).map(category => ({
          ...category,
          parentId: null
        }));
        this.setState({
          resolvedCategories
        });
      } else {
        this.setState({
          resolvedCategories: this.state.categories
        });
      }
    }, 500);
  }
  setMeasure(measureAndUnit) {
    const match = measureAndUnit.match(measureRegExp);
    if (match) {
      const measure = parseFloat(match[1]);
      const unit = match[3];
      if (measure && unit) {
        this.setState({
          measureAndUnit,
          measure,
          unit
        });
      } else {
        this.setState({
          measureAndUnit,
          measure: undefined,
          unit: undefined
        });
      }
    } else {
      this.setState({
        measureAndUnit,
        measure: undefined,
        unit: undefined
      });
    }
  }
  setPrice(price) {
    this.setState({price});
  }
  render() {
    const {
      attributes,
      resolvedCategories,
      searchCategoryName,
      measureAndUnit,
      price
    } = this.state;

    const columns = this.getColumns();

    if (!columns || !attributes || !resolvedCategories) return <></>;
    return (
      <div>
        <p>
          <label>
            Search category:&nbsp;
            <input
              type="search"
              value={searchCategoryName}
              onChange={event => this.setSearchCategoryName(event.target.value)}/>&nbsp;
          </label>
          <label>
            Measure:&nbsp;
            <input
              type="text"
              value={measureAndUnit}
              style={{width: '5em'}}
              onChange={event => this.setMeasure(event.target.value)}/>&nbsp;
          </label>
          <label>
            Price:&nbsp;
            <input
              type="number"
              value={price}
              style={{width: '5em'}}
              onChange={event => this.setPrice(event.target.value)}/>
          </label>
        </p>
        <TreeTable
          flat
          columns={columns}
          items={resolvedCategories}
          parentIdKey="parentId"/>
      </div>
    );
  }
}