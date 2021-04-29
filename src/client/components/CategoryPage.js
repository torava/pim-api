import axios from 'axios';
import React, {Component} from 'react';
import AsteriskTable from 'react-asterisk-table';

import { getCategoryWithAttributes } from '../../utils/categories';
import DataStore from './DataStore';
import { locale } from './locale';
import Attributes from './shared/Attributes';

export default class Category extends Component {
  constructor(props) {
    super(props);

    this.edit = this.edit.bind(this);
    this.cancel = this.cancel.bind(this);
    this.save = this.save.bind(this);

    this.onCategoryChange = this.onCategoryChange.bind(this);
    this.onCategoryParentChange = this.onCategoryParentChange.bind(this);
    this.onAttributeNameChange = this.onAttributeNameChange.bind(this);
    this.onAttributeParentChange = this.onAttributeParentChange.bind(this);
    this.onAttributeValueChange = this.onAttributeValueChange.bind(this);
    this.onAttributeUnitChange = this.onAttributeUnitChange.bind(this);
    this.onSourceNameChange = this.onSourceNameChange.bind(this);

    this.onAttributeSuggestionsClearRequested = this.onAttributeSuggestionsClearRequested.bind(this);
    this.onAttributeSuggestionsFetchRequested = this.onAttributeSuggestionsFetchRequested.bind(this);
    this.onCategoryParentSuggestionsClearRequested = this.onCategoryParentSuggestionsClearRequested.bind(this);
    this.onCategoryParentSuggestionsFetchRequested = this.onCategoryParentSuggestionsFetchRequested.bind(this);
    this.onCategorySuggestionsClearRequested = this.onCategorySuggestionsClearRequested.bind(this);
    this.onCategorySuggestionsFetchRequested = this.onCategorySuggestionsFetchRequested.bind(this);
    this.onSourceSuggestionsClearRequested = this.onSourceSuggestionsClearRequested.bind(this);
    this.onSourceSuggestionsFetchRequested = this.onSourceSuggestionsFetchRequested.bind(this);

    this.state = {
      locale: 'fi-FI'
    };

    Promise.all([
      DataStore.getAttributes(),
      DataStore.getCategories(),
      axios.get('/api/source/'),
      axios.get('/api/category/'+this.props.match.params.id)
    ])
    .then(([attributes, categories, sources, category]) => {
      this.setState({
        editable: false,
        attributes,
        categories,
        sources: sources.data,
        category: category.data[0],
        product_columns: this.getProductColumns(),
        attribute_columns: this.getAttributeColumns(),
        source_columns: this.getSourceColumns,
        attributeSuggestions: [],
        categorySuggestions: [],
        sourceSuggestions: [],
        attributeAggregates: {}
      });

      document.title = "Category - "+this.state.category.name[this.state.locale];

      this.addNewCategoryAttribute();
      this.addNewCategoryContribution();

      for (let i in this.state.category.attributes) {
        this.addNewCategoryAttributeSource(i);
      }
    })
    .catch(error => {
      console.error(error);
      throw new Error();
    });
  }
  getProductColumns() {
    return [
      {
        id: 'name',
        label: 'Name'
      },
      {
        id: 'price',
        label: 'Price',
        property: 'items[0].price'
      }
    ]
  }
  getAttributeColumns() {
    return [
      {
        id: 'name',
        label: 'Name',
        property: 'attribute.name.'+this.state.locale,
        formatter: (value) => (
          <span>{value}</span>
        )
      },
      {
        id: 'parent',
        label: 'Parent',
        //property: 'attribute.parent.name.'+that.state.locale,
        formatter: (value, item) => (
         <ul class="path">
            {this.getParentPath(item.attribute).map(parent => (
              <li>{parent.name[this.state.locale]}</li>
            ))}
          </ul>
        )
      },
      {
        id: 'value',
        label: 'Value',
        formatter: (value, item, index) => (
          this.state.editable ?
          <span>
            <input type="number"
                   value={value}
                   onChange={this.onAttributeValueChange.bind(this, index)}/>
            <input type="text"
                   value={item.attribute?.unit}
                   onChange={this.onAttributeUnitChange.bind(this, index)}/>
          </span> :
          <span>{value}{item.attribute?.unit ? ' '+item.attribute.unit : ''}</span>
        )
      }
    ]
  }
  getContributionAttributeColumns(selectedAttributes, categories = [], attributeUnits = {}) {
    let columns = [];
    let selectedAttribute;
    for (let key in selectedAttributes) {
      selectedAttribute = selectedAttributes[key];
      let column = {
        id: selectedAttribute.id,
        label: selectedAttribute.name[locale.getLocale()],
        formatter: (attribute => (
          (_, category) => {
            console.log('category', category);
            const [categoryWithAttribute, attributes] = getCategoryWithAttributes(categories, category.contribution?.id, attribute.id) || [undefined, [{}]];
            const {
              value,
              unit
            } = attributes[0];
  
            let rate = 1;
  
            const targetUnit = attributeUnits[selectedAttribute.name['en-US']];
            if (targetUnit) {
              rate = config.unitConversionRates?.[unit]?.[targetUnit] || 1;
            }
            
            if (!categoryWithAttribute) {
              return '';
            } else {
              return (
                <span style={{
                  color: categoryWithAttribute.id !== category.id ? 'gray' : 'inherit',
                  whiteSpace: 'nowrap'
                }}>
                  {`${new Intl.NumberFormat(locale.getLocale()).format(rate*value)} ${targetUnit || unit}`}
                </span>
              );
            }
          }
        ))(selectedAttribute)
      };
      columns.push(column);
    }
    return columns;
  }
  getContributionColumns() {
    return [
      {
        id: 'name',
        label: 'Name',
        property: 'contribution.name.'+this.state.locale,
        formatter: (value, item) => {
          if (item._aggregate) {
            return <strong>{item._aggregate}</strong>;
          } else {
            return <span><a href={`/category/${item.contribution?.id}`}>{value}</a></span>;
          }
        }
      },
      {
        id: 'amount',
        label: 'Amount',
        formatter: (value, item, index) => {
          if (item._aggregate) {
            return <strong>{value}{item.unit ? ' '+item.unit : ''}</strong>;
          }
          if (this.state.editable) {
            return (<span>
              <input type="number"
                    value={value}
                    onChange={this.onContributionAmountChange.bind(this, index)}/>
              <input type="text"
                    value={item.unit}
                    onChange={this.onContributionUnitChange.bind(this, index)}/>
            </span>);
          }
          else {
            return (<span>{value}{item.unit ? ' '+item.unit : ''}</span>);
          }
        }
      }
    ].concat(this.getContributionAttributeColumns(this.state.attributeAggregates, this.state.categories, locale.getAttributeUnits()));
  }
  addNewCategoryAttribute() {
    let category = Object.assign({}, this.state.category);

    category.attributes.push({
      attribute: {
        parent: {}
      },
      sources: []
    });

    this.setState({
      category
    });
  }
  addNewCategoryContribution() {
    let category = Object.assign({}, this.state.category);

    category.contributions.push({});

    this.setState({
      category
    });
  }
  addNewCategoryAttributeSource(index) {
    let category = Object.assign({}, this.state.category);

    category.attributes[index].sources.push({
      source: {}
    });

    this.setState({
      category
    });
  }
  getSourceColumns() {
    return [
      {
        id: 'name',
        label: 'Name',
        property: 'source.name',
        formatter: (value) => (
          <span>{value}</span>
        )
      },
      {
        id: 'publication_date',
        label: 'Publication date',
        property: 'source.publication_date',
        formatter: (value) => (
          this.state.editable ?
          <input value={value}/> :
          <span>{value}</span>
        )
      },
      {
        id: 'publication_url',
        label: 'Publication URL',
        property: 'source.publication_url',
        formatter: (value) => (
          this.state.editable ?
          <input value={value}/> :
          <span>{value}</span>
        )
      },
      {
        id: 'reference_date',
        label: 'Reference date',
        formatter: (value) => (
          this.state.editable ?
          <input value={value}/> :
          <span>{value}</span>
        )
      },
      {
        id: 'reference_url',
        label: 'Reference URL',
        formatter: (value) => (
          this.state.editable ?
          <input value={value}/> :
          <span>{value}</span>
        )
      }
    ]
  }

  onCategoryChange(event, val) {
    let category = Object.assign({}, this.state.category),
        categories = this.state.categories.slice(0),
        name = val && val.newValue || event.target.value,
        id;
    
    for (let i in categories) {
      if (categories[i].name[this.state.locale] == name) {
        category = {
          id: categories[i].id
        }
        break;
      }
    }

    if (!category.name)
      category.name = {};

    category.name[this.state.locale] = name;

    this.setState({
      category,
      categories
    });
  }
  onCategoryParentChange(event, val) {
    let category = Object.assign({}, this.state.category),
        categories = this.state.categories,
        name = val && val.newValue || event.target.value;
    
    for (let i in categories) {
      if (categories[i].name[this.state.locale] == name) {
        category.parent = {
          id: categories[i].id
        }
        break;
      }
    }

    if (!category.parent.name)
      category.parent.name = {};

    category.parent.name[this.state.locale] = name;

    this.setState({
      category
    });
  }

  onAttributeNameChange(index, event, val) {
    let category = Object.assign({}, this.state.category),
        attributes = this.state.attributes,
        name = val && val.newValue || event.target.value;

    // is new

    if (category.attributes.length-1 == index && !category.attributes[index].attribute) {
      this.addNewCategoryAttribute();
    }

    for (let i in attributes) {
      if (attributes[i].name[this.state.locale] == name) {
        category.attributes[index].attribute = {
          id: attributes[i].id,
          name: attributes[i].name
        }
      }
    }

    if (!category.attributes[index].attribute.name)
      category.attributes[index].attribute.name = {};

    category.attributes[index].attribute.name[this.state.locale] = name;

    this.setState({
      category
    });
  }
  onAttributeParentChange(index, items) {
    let category = Object.assign({}, this.state.category),
        attribute = {},
        parent = attribute,
        item;

    console.dir(items);

    while (item = items.pop()) {
      parent.parent = item;
      parent = parent.parent;
    }

    category.attributes[index].attribute.parent = attribute.parent;

    this.setState({
      category
    });
  }
  onAttributeValueChange(index, event) {
    let category = Object.assign({}, this.state.category);

    category.attributes[index].value = event.target.value;

    this.setState({
      category
    });
  }
  onAttributeUnitChange(index, event) {
    let category = Object.assign({}, this.state.category);

    category.attributes[index].unit = event.target.value;

    console.log(category);

    this.setState({
      category
    });
  }
  onSourceNameChange(attribute_index, source_index, event, val) {
    let category = Object.assign({}, this.state.category),
        sources = this.state.sources,
        name = val && val.newValue || event.target.value,
        id;

    for (let i in sources) {
      if (sources[i].name == name) {
        category.attributes[attribute_index].sources[source_index].source = {
          id: sources[i].id,
          name: sources[i].name
        }
      }
    }

    category.attributes[attribute_index].sources[source_index].source.name = name;

    this.setState({
      category
    });
  }

  onAttributeSuggestionsFetchRequested({ value }) {
    this.setState({
      attributeSuggestions: this.getAttributeSuggestions(value)
    });
  };
  onAttributeSuggestionsClearRequested() {
    this.setState({
      attributeSuggestions: []
    });
  };
  getAttributeSuggestions(value) {
    const inputValue = value.trim().toLowerCase(),
          inputLength = inputValue.length,
          that = this;

    return inputLength === 0 ? [] : that.state.attributes.filter(attribute => {
      let name = attribute.name[that.state.locale];
      return name && name.toLowerCase().slice(0, inputLength) === inputValue;
    });
  };

  onSourceSuggestionsFetchRequested({ value }) {
    this.setState({
      sourceSuggestions: this.getSourceSuggestions(value)
    });
  };
  onSourceSuggestionsClearRequested() {
    this.setState({
      sourceSuggestions: []
    });
  };
  getSourceSuggestions(value) {
    const inputValue = value.trim().toLowerCase();
    const inputLength = inputValue.length;

    return inputLength === 0 ? [] : this.state.sources.filter(source => {
      let name = source.name;
      return name && name.toLowerCase().slice(0, inputLength) === inputValue;
    });
  };

  onCategorySuggestionsFetchRequested({ value }) {
    this.setState({
      categorySuggestions: this.getCategorySuggestions(value)
    });
  }
  onCategorySuggestionsClearRequested() {
    this.setState({
      categorySuggestions: []
    });
  }
  getCategorySuggestions(value) {
    const inputValue = value.trim().toLowerCase(),
          inputLength = inputValue.length,
          that = this;

    return inputLength === 0 ? [] : that.state.categories.filter(item => {
      let value = item.name[that.state.locale];
      return value && value.toLowerCase().slice(0, inputLength) === inputValue;
    });
  }

  onCategoryParentSuggestionsFetchRequested({ value }) {
    this.setState({
      categorySuggestions: this.getCategoryParentSuggestions(value)
    });
  }
  onCategoryParentSuggestionsClearRequested() {
    this.setState({
      categorySuggestions: []
    });
  }
  getCategoryParentSuggestions(value) {
    const inputValue = value.trim().toLowerCase(),
          inputLength = inputValue.length,
          that = this;

    return inputLength === 0 ? [] : that.state.categories.filter(item => {
      let value = item.parent.name[that.state.locale];
      return value && value.toLowerCase().slice(0, inputLength) === inputValue;
    });
  }

  filterOption(option, inputValue) {
    inputValue = inputValue.trim().toLowerCase();

    let inputLength = inputValue.length;

    console.log(option, inputValue);

    return inputLength > 0 && option.label.toLowerCase().slice(0, inputLength) === inputValue;
  }

  edit(event) {
    event.preventDefault();

    this.setState({
      editable: true,
      previous_category: Object.assign({}, this.state.category),
      product_columns: this.getProductColumns(),
      attribute_columns: this.getAttributeColumns(),
      source_columns: this.getSourceColumns(),
      attributeSuggestions: [],
      categorySuggestions: [],
      sourceSuggestions: []
    });
  }
  cancel(event) {
    event.preventDefault();
    
    this.setState({
      editable: false,
      category: Object.assign({}, this.state.previous_category),
      product_columns: this.getProductColumns(),
      attribute_columns: this.getAttributeColumns(),
      source_columns: this.getSourceColumns(),
      attributeSuggestions: [],
      categorySuggestions: [],
      sourceSuggestions: []
    });
  }
  save(event) {
    let that = this,
        category = Object.assign({}, this.state.category);

    event.preventDefault();

    category.attributes.filter(attribute => {
      attribute.sources.filter(source => {
        return !!source.name;
      });
      return !!attribute.name;
    });
    category.contributions.filter(contribution => {
      return !!contribution.name
    });
    
    axios.post('/api/category/', category)
    .then(function(response) {
      console.log(response);
      that.setState({
        editable: false
      });
    })
    .catch(function(error) {
      console.error(error);
    });
  }
  getParents(item) {
    let result = [], parent = Object.assign({}, item);
    if (parent) {
      while (parent = parent.parent) {
        if (!parent || !parent.name) continue;
        result.push(parent);
      }
      //result.pop();
      result.reverse();
    }
    return result;
  }
  getParentPath(item) {
    let result = [],
        parent = item;
    if (parent) {
      while (parent = parent.parent) {
        if (!parent || !parent.name) continue;
        result.push(parent);
      }
      result.reverse();
    }
    return result;
  }

  getResolvedCategories() {
    let result = this.state.categories.slice(0);
    result = result.map((item, i) => ({
      id: item.id,
      name: item.name[this.state.locale]
    }));
    return result;
  }


  getResolvedAttributes() {
    let result = this.state.attributes.slice(0);
    result = result.map((item, i) => ({
      id: item.id,
      name: item.name[this.state.locale]
    }));
    return result;
  }

  render() {
    const {
      category,
      attributes,
      locale,
      editable,
      product_columns,
      attributeAggregates
    } = this.state;

    if (!category || !attributes) return null;

    return (
      <div>
        <div id="viewing-nav" style={{display: !editable ? "block" : "none"}}>
          <a href="#" onClick={this.edit} style={{float:"right"}}>Edit</a>
        </div>
        <div id="editing-nav" style={{display: editable ? "block" : "none"}}>
          <a href="#" onClick={this.cancel} style={{float:"left"}}>Cancel</a>
          <a href="#" onClick={this.save} style={{float:"right"}}>Save</a>
        </div>
        <div style={{clear:"both"}}/>
          <ul className="path">
            {this.getParentPath(category).map((parent) => (
              <li key={`path-${parent.id}`}>
                <a href={parent.id}>{parent.name[locale]}</a>
              </li>
            ))}
          </ul>
        <h1>
          {category.name[locale]}
        </h1>
        <small>
          {category.aliases?.join(', ')}
        </small>
        <h2>Contributions</h2>
        <AsteriskTable
          columns={this.getContributionColumns()}
          items={[...category.contributions, {
            _aggregate: "Total",
            amount: (() => {
              let total = 0;
              category.contributions.map((item) => {
                total+= item.amount || 0;
              })
              return total;
            })(),
            unit: 'g'
          }]}
        />
        <h3>Contribution Attributes</h3>
        <Attributes
          attributes={attributes}
          attributeAggregates={attributeAggregates}
          setAttributeAggregates={(attributeAggregates) => this.setState({attributeAggregates})}/>
        <h2>Attributes</h2>
        <AsteriskTable
          columns={this.state.attribute_columns}
          items={this.state.category.attributes}
          childView={(attribute, index) => (
            <AsteriskTable
              columns={this.getSourceColumns(index)}
              items={attribute.sources}
              tableProps={{
                className: 'no-more-tables'
              }}
            />
          )}
        />
        <h2>Products</h2>
        <AsteriskTable
          columns={product_columns}
          items={category.products}
        />
        {/*this.state.category.attributes.map((attribute, i) => (
          <div>
            <div>
              <span contentEditable="true">{attribute.attribute.name['fi-FI']}</span>
              <span contentEditable="true">{attribute.value}</span>
              <span>{attribute.attribute.unit}</span>
            </div>
            <div>
              {attribute.sources.map((source, i) => (
                <div>
                  <span contentEditable="true">{source.name}</span>
                  <span contentEditable="true">{source.year}</span>
                </div>
              ))}
            </div>
          </div>
        ))*/}
      </div>
    );
  }
}