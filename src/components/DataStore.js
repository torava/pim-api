import axios from "axios";
import { locale } from "./locale";

export default {
  constructor() {
    this.manufacturers = [];
    this.transactions = [];
    this.parties = [];
    this.groups = [];
    this.attributes = [];
    this.categories = [];
    this.categories_attributes = [];
  },
  getManufacturers() {
    return new Promise((resolve, reject) => {
      if (this.manufacturers) {
        resolve(this.manufacturers);
      }
      else {
        axios.get('/api/manufacturer')
        .then(response => {
          this.manufacturers = response.data;
          resolve(this.manufacturers);
        })
        .catch(error => {
          reject(error);
        });
      }
    });
  },
  getTransactions(fetch) {
    return new Promise((resolve, reject) => {
      if (this.transactions && !fetch) {
        resolve(this.transactions);
      }
      else {
        axios.get('/api/transaction')
        .then(response => {
          this.transactions = response.data;
          resolve(this.transactions);
        })
        .catch(error => {
          reject(error);
        });
      }
    });
  },
  getParties(fetch) {
    return new Promise((resolve, reject) => {
      if (this.parties && !fetch) {
        resolve(this.parties);
      }
      else {
        axios.get('/api/party')
        .then(response => {
          this.parties = response.data;
          resolve(this.parties);
        })
        .catch(error => {
          reject(error);
        });
      }
    });
  },
  async getGroups(fetch) {
    if (this.groups && !fetch) {
      return this.groups;
    }
    else {
      try {
        const response = await axios.get('/api/group');
        this.groups = response.data;
        return this.groups;
      } catch(error) {
        console.error(error);
      }
    }
  },
  getProducts() {
    return new Promise((resolve, reject) => {
      if (this.products) {
        resolve(this.products);
      }
      else {
        axios.get('/api/product')
        .then(response => {
          this.products = response.data;
          resolve(this.products);
        })
        .catch(error => {
          reject(error);
        });
      }
    });
  },
  getAttributes(fetch) {
    return new Promise((resolve, reject) => {
      if (this.attributes && !fetch) {
        resolve(this.attributes);
      }
      else {
        axios.get('/api/attribute?parent')
        .then(response => {
          this.attributes = response.data;
          resolve(this.attributes);
        })
        .catch(error => {
          reject(error);
        });
      }
    });
  },
  getCategories(fetch) {
    return new Promise((resolve, reject) => {
      if (this.categories && !fetch) {
        resolve(this.categories);
      }
      else {
        const currentLocale = locale.getLocale();
        axios.get(`/api/category?attributes&locale=${currentLocale}`)
        .then(response => {
          this.categories = response.data;
          resolve(this.categories);
        })
        .catch(error => {
          reject(error);
        });
      }
    });
  },
  getCategoriesWithAttributes(fetch) {
    return new Promise((resolve, reject) => {
      if (this.categories_attributes && !fetch) {
        resolve(this.categories_attributes);
      }
      else {
        const currentLocale = locale.getLocale();
        axios.get(`/api/category?attributes&parent&locale=${currentLocale}`)
        .then(response => {
          this.categories_attributes = response.data;
          resolve(this.categories_attributes);
        })
        .catch(error => {
          reject(error);
        });
      }
    });
  }
}