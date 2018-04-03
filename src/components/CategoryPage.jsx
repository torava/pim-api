'use strict';

import axios from 'axios';
import React, {Component} from 'react';
import Autosuggest from 'react-autosuggest';
import EditableTable from './EditableTable';

class Category extends Component {
  constructor(props) {
    super(props);

    let that = this;

    axios.get('/api/attribute/')
    .then((attributes) => {
      axios.get('/api/category/')
      .then((categories) => {
        axios.get('/api/category/?id='+that.props.match.params.id)
        .then((category) => {
          that.setState({
            editable: false,
            attributes,
            categories,
            category: category.data[0],
            product_columns: that.getProductColumns(),
            attribute_columns: that.getAttributeColumns(),
            source_columns: that.getSourceColumns(),
            attributeSuggestions: [],
            categorySuggestions: [],
            sourceSuggestions: []
          });
        });
      });
    });

    this.edit = this.edit.bind(this);
    this.cancel = this.cancel.bind(this);
    this.save = this.save.bind(this);
    this.onAttributeSuggestionsClearRequested = this.onAttributeSuggestionsClearRequested.bind(this);
    this.onAttributeSuggestionsFetchRequested = this.onAttributeSuggestionsFetchRequested.bind(this);
    this.onCategoryParentSuggestionsClearRequested = this.onCategoryParentSuggestionsClearRequested.bind(this);
    this.onCategoryParentSuggestionsFetchRequested = this.onCategoryParentSuggestionsFetchRequested.bind(this);
    this.onCategorySuggestionsClearRequested = this.onCategorySuggestionsClearRequested.bind(this);
    this.onCategorySuggestionsFetchRequested = this.onCategorySuggestionsFetchRequested.bind(this);
    this.onSourceSuggestionsClearRequested = this.onSourceSuggestionsClearRequested.bind(this);
    this.onSourceSuggestionsFetchRequested = this.onSourceSuggestionsFetchRequested.bind(this);
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
    // When suggestion is clicked, Autosuggest needs to populate the input
    // based on the clicked suggestion. Teach Autosuggest how to calculate the
    // input value for every given suggestion.
    const getAttributeSuggestionValue = suggestion => suggestion.name['fi-FI'];

    // Use your imagination to render suggestions.
    const renderAttributeSuggestion = suggestion => (
      <div>
        {getAttributeSuggestionValue(suggestion)}
      </div>
    );

    const attributeInputProps = (value, item) => {
      return {
        placeholder: 'Attribute',
        value,
        onChange: function() {}
      }
    };

    const that = this;

    return [
      {
        id: 'name',
        label: 'Name',
        property: 'attribute.name.fi-FI',
        formatter: (value, item) => (
          this.state.editable ?
          <Autosuggest
            suggestions={that.state.attributeSuggestions}
            onSuggestionsFetchRequested={that.onAttributeSuggestionsFetchRequested}
            onSuggestionsClearRequested={that.onAttributeSuggestionsClearRequested}
            getSuggestionValue={getAttributeSuggestionValue}
            renderSuggestion={renderAttributeSuggestion}
            inputProps={attributeInputProps(value, item)}
          /> :
          <span>{value}</span>
        )
      },
      {
        id: 'parent',
        label: 'Parent',
        property: 'attribute.parent.name.fi-FI',
        formatter: (value, item) => (
          this.state.editable ?
          <Autosuggest
            suggestions={that.state.attributeSuggestions}
            onSuggestionsFetchRequested={that.onAttributeSuggestionsFetchRequested}
            onSuggestionsClearRequested={that.onAttributeSuggestionsClearRequested}
            getSuggestionValue={getAttributeSuggestionValue}
            renderSuggestion={renderAttributeSuggestion}
            inputProps={attributeInputProps(value, item)}
          /> :
          <span>{that.getParentPath(item.attribute)}</span>
        )
      },
      {
        id: 'value',
        label: 'Value',
        formatter: (value, item) => (
          this.state.editable ?
          <span><input type="number" value={value}/> {item.attribute.unit}</span> :
          <span>{value}</span>
        )
      }
    ]
  }
  getSourceColumns() {
    let that = this;

    const getSourceSuggestionValue = suggestion => suggestion.name;

    // Use your imagination to render suggestions.
    const renderSourceSuggestion = suggestion => (
      <div>
        {getSourceSuggestionValue(suggestion)}
      </div>
    );

    const sourceInputProps = (value, item) => {
      return {
        placeholder: 'Source',
        value,
        onChange: function() {}
      }
    };

    return [
      {
        id: 'name',
        label: 'Name',
        property: 'source.name',
        formatter: (value, item) => (
          that.state.editable ?
          <Autosuggest
            suggestions={that.state.sourceSuggestions}
            onSuggestionsFetchRequested={that.onSourceSuggestionsFetchRequested}
            onSuggestionsClearRequested={that.onSourceSuggestionsClearRequested}
            getSuggestionValue={getSourceSuggestionValue}
            renderSuggestion={renderSourceSuggestion}
            inputProps={sourceInputProps(value, item)}
          /> :
          <span>{value}</span>
        )
      },
      {
        id: 'publication_date',
        label: 'Publication date',
        property: 'source.publication_date',
        formatter: (value, item) => (
          that.state.editable ?
          <input value={value}/> :
          <span>{value}</span>
        )
      },
      {
        id: 'publication_url',
        label: 'Publication URL',
        property: 'source.publication_url',
        formatter: (value, item) => (
          that.state.editable ?
          <input value={value}/> :
          <span>{value}</span>
        )
      },
      {
        id: 'reference_date',
        label: 'Reference date',
        formatter: (value, item) => (
          that.state.editable ?
          <input value={value}/> :
          <span>{value}</span>
        )
      },
      {
        id: 'reference_url',
        label: 'Reference URL',
        formatter: (value, item) => (
          that.state.editable ?
          <input value={value}/> :
          <span>{value}</span>
        )
      }
    ]
  }
  // Autosuggest will call this function every time you need to update suggestions.
  // You already implemented this logic above, so just use it.
  onAttributeSuggestionsFetchRequested({ value }) {
    this.setState({
      attributeSuggestions: this.getAttributeSuggestions(value)
    });
  };

  // Autosuggest will call this function every time you need to clear suggestions.
  onAttributeSuggestionsClearRequested() {
    this.setState({
      attributeSuggestions: []
    });
  };

  // Teach Autosuggest how to calculate suggestions for any given input value.
  getAttributeSuggestions(value) {
    const inputValue = value.trim().toLowerCase();
    const inputLength = inputValue.length;

    return inputLength === 0 ? [] : this.state.attributes.filter(attribute => {
      let name = attribute.name['fi-FI'];
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
    const inputValue = value.trim().toLowerCase();
    const inputLength = inputValue.length;

    return inputLength === 0 ? [] : this.state.categories.filter(item => {
      let value = item.name['fi-FI'];
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
    const inputValue = value.trim().toLowerCase();
    const inputLength = inputValue.length;

    return inputLength === 0 ? [] : this.state.categories.filter(item => {
      let value = item.parent.name['fi-FI'];
      return value && value.toLowerCase().slice(0, inputLength) === inputValue;
    });
  }

  edit() {
    this.setState({
      editable: true,
      product_columns: this.getProductColumns(),
      attribute_columns: this.getAttributeColumns(),
      source_columns: this.getSourceColumns(),
      attributeSuggestions: [],
      categorySuggestions: [],
      sourceSuggestions: []
    });
  }
  cancel() {
    this.setState({
      editable: false,
      product_columns: this.getProductColumns(),
      attribute_columns: this.getAttributeColumns(),
      source_columns: this.getSourceColumns(),
      attributeSuggestions: [],
      categorySuggestions: [],
      sourceSuggestions: []
    });
  }
  save() {
    this.setState({
      editable: false,
      product_columns: this.getProductColumns(),
      attribute_columns: this.getAttributeColumns(),
      source_columns: this.getSourceColumns(),
      attributeSuggestions: [],
      categorySuggestions: [],
      sourceSuggestions: []
    });
  }
  getParentPath(item) {
    let result = [], parent = item;
    while (parent = parent.parent) {
      result.push(<a href={parent.id}>{parent.name['fi-FI']}</a>);
      result.push(' > ');
    }
    result.pop();
    result.reverse();
    return result;
  }

  render() {
    if (!this.state || !this.state.category || !this.state.attributes) return null;

    const that = this;

    const getCategorySuggestionValue = suggestion => suggestion.name['fi-FI'];
    const renderCategorySuggestion = suggestion => (
      <div>
        {getCategorySuggestionValue(suggestion)}
      </div>
    );

    const getCategoryParentSuggestionValue = suggestion => suggestion.parent.name['fi-FI'];
    const renderCategoryParentSuggestion = suggestion => (
      <div>
        {getCategoryParentSuggestionValue(suggestion)}
      </div>
    );

    return (
      <div>
        <div id="viewing-nav" style={{display: !this.state.editable ? "block" : "none"}}>
          <a href="#" onClick={this.edit} style={{float:"right"}}>Edit</a>
        </div>
        <div id="editing-nav" style={{display: this.state.editable ? "block" : "none"}}>
          <a href="#" onClick={this.cancel} style={{float:"left"}}>Cancel</a>
          <a href="#" onClick={this.save} style={{float:"right"}}>Save</a>
        </div>
        <div style={{clear:"both"}}/>
        {that.getParentPath(that.state.category)}
        <h1>
          {this.state.editable ?
            <Autosuggest
              suggestions={that.state.categorySuggestions}
              onSuggestionsFetchRequested={that.onCategorySuggestionsFetchRequested}
              onSuggestionsClearRequested={that.onCategorySuggestionsClearRequested}
              getSuggestionValue={getCategorySuggestionValue}
              renderSuggestion={renderCategorySuggestion}
              inputProps={{
                placeholder: 'Category',
                value: that.state.category.name['fi-FI'],
                onChange: function() {}
              }}
            /> :
            that.state.category.name['fi-FI']
          }
        </h1>
        <div>
          Parent:
          {this.state.editable ?
            <Autosuggest
              suggestions={that.state.categorySuggestions}
              onSuggestionsFetchRequested={that.onCategoryParentSuggestionsFetchRequested}
              onSuggestionsClearRequested={that.onCategoryParentSuggestionsClearRequested}
              getSuggestionValue={getCategoryParentSuggestionValue}
              renderSuggestion={renderCategoryParentSuggestion}
              inputProps={{
                placeholder: 'Category',
                value: that.state.category.parent.name['fi-FI'],
                onChange: function() {}
              }}
            /> :
            <a href={this.state.category.parent.id}>{that.state.category.parent.name['fi-FI']}</a>
          }
        </div>
        <h2>Attributes</h2>
        <EditableTable
          columns={this.state.attribute_columns}
          items={this.state.category.attributes}
          childView={(attribute) => (
            <EditableTable
              columns={this.state.source_columns}
              items={attribute.sources}
            />
          )}
        />
        <h2>Products</h2>
        <EditableTable
          columns={this.state.product_columns}
          items={this.state.category.products}
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

module.exports = Category;