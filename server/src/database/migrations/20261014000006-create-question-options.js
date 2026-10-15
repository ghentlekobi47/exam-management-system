'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('question_options', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      question_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'questions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      text: { type: Sequelize.STRING(500), allowNull: false },
      is_correct: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      position: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('question_options')
  },
}
