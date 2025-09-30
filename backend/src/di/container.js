const logger = require('@utils/logger').child({ module: 'di-container' });

class DIContainer {
  constructor() {
    this.factories = new Map();
    this.singletons = new Map();
  }

  /**
   * Register a factory function for a dependency
   * @param {string} name - Dependency name
   * @param {Function} factory - Factory function that returns the instance
   * @param {boolean} singleton - Whether to cache the instance 
   */
  register(name, factory, singleton = true) {
    if (this.factories.has(name)) {
      logger.warn({ name }, 'Overwriting existing factory registration');
    }

    this.factories.set(name, { factory, singleton });
    logger.debug({ name, singleton }, 'Registered dependency');
  }

  /**
   * Register a value directly (always singleton)
   * @param {string} name - Dependency name
   * @param {*} value - The value to register
   */
  registerValue(name, value) {
    this.singletons.set(name, value);
    logger.debug({ name }, 'Registered value');
  }

  /**
   * Resolve a dependency by name
   * @param {string} name - Dependency name
   * @returns {*} The resolved dependency
   */
  resolve(name) {
    if (this.singletons.has(name)) {
      return this.singletons.get(name);
    }

    if (!this.factories.has(name)) {
      throw new Error(`Dependency "${name}" not registered`);
    }

    const { factory, singleton } = this.factories.get(name);

    const instance = factory(this);

    // Cache if singleton
    if (singleton) {
      this.singletons.set(name, instance);
    }

    return instance;
  }

  /**
   * Check if a dependency is registered
   * @param {string} name - Dependency name
   * @returns {boolean}
   */
  has(name) {
    return this.factories.has(name) || this.singletons.has(name);
  }

  clear() {
    this.factories.clear();
    this.singletons.clear();
    logger.debug('Container cleared');
  }
}

module.exports = new DIContainer();