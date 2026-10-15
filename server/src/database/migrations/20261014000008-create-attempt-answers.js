'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('attempt_answers', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      attempt_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'exam_attempts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      question_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'questions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      selected_option_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'question_options', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      is_correct: { type: Sequelize.BOOLEAN, allowNull: true },
      points_awarded: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    })

    await queryInterface.addIndex('attempt_answers', ['attempt_id', 'question_id'], {
      unique: true,
      name: 'attempt_answers_attempt_question_unique',
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('attempt_answers')
  },
}
