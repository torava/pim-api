'use strict';

import React, {Component} from 'react';
import Autosuggest from 'react-autosuggest';

class Field extends Component {
  constructor(props) {
    super(props);

    this.state = {
      suggestions: []
    }
  }

  // Teach Autosuggest how to calculate suggestions for any given input value.
  getSuggestions(value) {
    const that = this;

    const inputValue = value.trim().toLowerCase();
    const inputLength = inputValue.length;

    return inputLength === 0 ? [] : this.props.items.filter(item => {
      let value = _.get(item, that.props.property);
      return value && value.toLowerCase().slice(0, inputLength) === inputValue;
    });
  };

  // Autosuggest will call this function every time you need to update suggestions.
  // You already implemented this logic above, so just use it.
  onSuggestionsFetchRequested({ value }) {
    this.setState({
      suggestions: this.getSuggestions(value)
    });
  };

  // Autosuggest will call this function every time you need to clear suggestions.
  onSuggestionsClearRequested() {
    this.setState({
      suggestions: []
    });
  };
  

  render() {
    const that = this;

    if (!this.state.editable) {
      return (
        <span>{_.get(item, that.props.property)}</span>
      );
    }
    else if (this.props.items) {
      const getSourceSuggestionValue = suggestion => _.get(suggestions, that.props.property);

      // Use your imagination to render suggestions.
      const renderSourceSuggestion = suggestion => (
        <div>
          {getSourceSuggestionValue(suggestion)}
        </div>
      );

      return (
        <Autosuggest
                suggestions={that.state.suggestions}
                onSuggestionsFetchRequested={that.onSuggestionsFetchRequested}
                onSuggestionsClearRequested={that.onSuggestionsClearRequested}
                getSuggestionValue={getSuggestionValue}
                renderSuggestion={renderSuggestion}
                inputProps={that.props.inputProps}
              />
      );
    }
  }
}

module.exports = Category;