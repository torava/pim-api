class Locale {
  constructor() {
    this.currency = 'eur';
    this.locale = 'en-us';

    if (typeof window !== 'undefined') {
      this.currency = window.localStorage.getItem('currency') || 'EUR';
      this.locale = window.localStorage.getItem('locale') || window.navigator.language;
      this.attribute_units = JSON.parse(window.localStorage.getItem('attribute_units') || '{}');
    }
  }
  convertMeasure(measure, from_unit, to_unit) {
    const factors = {
      y: -24,
      z: -21,
      a: -16,
      f: -15,
      p: -12,
      n: -9,
      µ: -6,
      m: -3,
      c: -2,
      d: -1,
      '': 0,
      da: 1,
      h: 2,
      k: 3,
      M: 6,
      G: 9,
      T: 12,
      P: 15,
      E: 18,
      Z: 21,
      Y: 24
    }
    if (from_unit && from_unit.length > 1) {
      from_unit = from_unit.substring(0,1);
      from_unit = from_unit.toLowerCase();
    }
    else {
      from_unit = '';
    }
    if (to_unit && to_unit.length > 1) {
      to_unit = to_unit.substring(0,1);
      to_unit = to_unit.toLowerCase();
    }
    else {
      to_unit = '';
    }
    let conversion = factors[from_unit]-factors[to_unit];
    console.log(conversion, from_unit, to_unit);
    return measure*Math.pow(10, conversion);
  }
  setCurrency(currency) {
    console.log(currency);
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