import axios from "axios";

export default {
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
  getCategories() {
    return new Promise((resolve, reject) => {
      if (this.categories) {
        resolve(this.categories);
      }
      else {
        axios.get('/api/category')
        .then(response => {
          this.categories = response.data;
          resolve(this.categories);
        })
        .catch(error => {
          reject(error);
        });
      }
    });
  }
}