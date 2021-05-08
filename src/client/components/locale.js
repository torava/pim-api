class Locale {
  constructor() {
    this.currency = 'EUR';
    this.locale = 'en-US';
    this.attribute_units = '{}';

    if (typeof window !== 'undefined') {
      this.currency = window.localStorage.getItem('currency') || 'EUR';
      this.locale = window.localStorage.getItem('locale') || window.navigator.language;
      this.attribute_units = JSON.parse(window.localStorage.getItem('attribute_units') || '{}');
    }
  }
  setCurrency(currency) {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('currency', currency);
      this.currency = currency;
    }
    else {
      console.error('window missing');
    }
  }
  setLocale(locale) {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('locale', locale);
      this.locale = locale;
    }
    else {
      console.error('window missing');
    }
  }
  setAttributeUnit(attribute, unit) {
    if (typeof window !== 'undefined') {
      this.attribute_units[attribute] = unit;
      window.localStorage.setItem('attribute_units', JSON.stringify(this.attribute_units));
    }
    else {
      console.error('window missing');
    }
  }
  getCurrency() {
    return this.currency;
  }
  getLocale() {
    return this.locale;
  }
  getLanguage() {
    return this.locale.substring(0, 2);
  }
  getAttributeUnits() {
    return this.attribute_units;
  }
  getAttributeUnit(attribute) {
    return this.attribute_units[attribute];
  }
  getNameLocale(name, strict) {
    if (!name) {
      return name;
    }
    if (typeof name === 'string') {
      return name;
    }
    else if (name.hasOwnProperty(locale.getLocale())) {
      return name[locale.getLocale()];
    }
    else if (!strict) {
      return Object.values(name)[0];
    }
    else return '';
  }
  getTranslation(field) {
    let translations = {
      'en-us': {
        'overview.categories.title': 'Categories',
        'overview.transactions.title': 'Transactions'
      }
    }

    return (translations.hasOwnProperty(this.locale) &&
           translations[this.locale].hasOwnProperty(field)) ?
           translations[this.locale][field] :
           translations['en-us'][field];
  }
}

export const locale = new Locale();