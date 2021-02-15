class Ui {
  constructor() {
    this.currentGroupId = -1;

    if (typeof window !== 'undefined') {
      this.currentGroupId = window.localStorage.getItem('currentGroupId');
    }
  }
  getCurrentGroup() {
    return this.currentGroupId
  }
  setCurrentGroup(id) {
    window.localStorage.setItem('currentGroupId', id);
    this.currentGroupId = id;
  }
}

export default new Ui();
