import React from 'react';

export default class Locale extends React.Component {
  constructor(props) {
    super(props);

    if (typeof window !== 'undefined') {
      this.state = {
        currency: window.localStorage.getItem('currency'),
        locale: window.localStorage.getItem('locale')
      }
    }
    else {
      this.state = {
        currency: 'eur',
        locale: 'en-us'
      }
    }
  }
  setCurrency(currency) {
    console.log(currency);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('currency', currency);
    }
    this.setState({
      currency
    });
  }
  setLocale(locale) {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('locale', locale);
    }
    this.setState({
      locale
    });
  }
  getCurrency() {
    return this.state.currency;
  }
  getLocale() {
    return this.state.locale;
  }
  getTranslation(field) {
    let translations = {
      'en-us': {
        'overview.categories.title': 'Categories',
        'overview.transactions.title': 'Transactions'
      }
    }

    return (translations.hasOwnProperty(this.state.locale) &&
           translations[this.state.locale].hasOwnProperty(field)) ?
           translations[this.state.locale][field] :
           translations['en-us'][field];
  }
  render() {
    return this.props.children(locale);
  }
}