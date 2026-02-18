module.exports = class Lock {
  constructor() {
    this.map = new Map();
  }

  add(key, value) {
    if (this.map.has(key)) return null;
    this.map.set(key, value);
    return value;
  }

  remove(key) {
    if (!this.map.has(key)) return null;
    const value = this.map.get(key);
    this.map.delete(key);
    return value;
  }

  has(key) {
    return this.map.has(key);
  }

  get(key) {
    return this.map.get(key) ?? null;
  }

  get size() {
    return this.map.size;
  }

  clear() {
    this.map.clear();
  }
}