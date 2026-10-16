'use strict'

// When a user last changed their password; sign-ins from before then stop working
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'password_changed_at', {
      type: Sequelize.DATE,
      allowNull: true,
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'password_changed_at')
  },
}
