import React, {Component} from 'react';
import AsteriskTable from 'react-asterisk-table';
import tree from 'react-asterisk-table/lib/Tree';
import sortable from 'react-asterisk-table/lib/Sortable';

import { locale } from './locale';
import DataStore from './DataStore';
import { getAttributeColumns } from '../utils/ui';

const TreeTable = sortable(tree(AsteriskTable));

export default class CategoryList extends Component {
  constructor(props) {
    super(props);

    this.state = {
      searchCategoryName: '',
      categories: [],
      resolvedCategories: [],
      attributes: []
    };

    this.searchTimeout;

    Promise.all([
      DataStore.getAttributes(),
      DataStore.getCategories()
    ])
    .then(([attributes, categories]) => {
      this.setState({
        categories: categories,
        resolvedCategories: categories,
        attributes: attributes
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
      categories
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
          const translation = name[locale.getLocale()] || name['en-US'] || '';
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
          return <a href={`/category/${item.id}`}>
            {content}
          </a>;
        },
        width: '700'
      },
      {
        id: 'price',
        label: 'Price'
      },
    ].concat(getAttributeColumns(selectedAttributes, categories, attributeUnits));
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
          (category.name[locale.getLocale()] || '').toLowerCase().indexOf(searchCategoryName?.toLowerCase()) !== -1
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
  render() {
    const {
      attributes,
      resolvedCategories,
      searchCategoryName
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
              onChange={event => this.setSearchCategoryName(event.target.value)}/>
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