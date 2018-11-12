class Locale {
  constructor() {
    this.currency = 'eur';
    this.locale = 'en-us';

    if (typeof window !== 'undefined') {
      this.currency = window.localStorage.getItem('currency');
      this.locale = window.localStorage.getItem('locale');
    }
  }
  setCurrency(currency) {
    console.log(currency);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('currency', currency);
    }
    this.currency = currency;
  }
  setLocale(locale) {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('locale', locale);
    }
    this.locale = locale;
  }
  getCurrency() {
    return this.currency;
  }
  getLocale() {
    return this.locale;
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