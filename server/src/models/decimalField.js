const { DataTypes } = require('sequelize')

// MySQL returns DECIMAL columns as strings ("1.50"); this returns them as numbers (1.5)
function decimalField(name, precision, scale, options = {}) {
  return {
    type: DataTypes.DECIMAL(precision, scale),
    ...options,
    get() {
      const value = this.getDataValue(name)
      return value === null || value === undefined ? value : Number(value)
    },
  }
}

module.exports = decimalField
