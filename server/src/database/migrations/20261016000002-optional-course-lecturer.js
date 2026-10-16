'use strict'

// A course can be created before any lecturer exists; the admin assigns one later
module.exports = {
  async up(queryInterface) {
    // MODIFY keeps the existing foreign key to users
    await queryInterface.sequelize.query('ALTER TABLE courses MODIFY lecturer_id INT NULL')
  },

  async down(queryInterface) {
    // Only works once every course has a lecturer again
    await queryInterface.sequelize.query('ALTER TABLE courses MODIFY lecturer_id INT NOT NULL')
  },
}
