'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('questions', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      exam_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'exams', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM('multiple_choice', 'true_false'),
        allowNull: false,
      },
      text: { type: Sequelize.TEXT, allowNull: false },
      points: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 1 },
      position: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('questions')
  },
}
