'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('exams', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      course_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'courses', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      title: { type: Sequelize.STRING(200), allowNull: false },
      instructions: { type: Sequelize.TEXT, allowNull: true },
      duration_minutes: { type: Sequelize.INTEGER, allowNull: false },
      start_at: { type: Sequelize.DATE, allowNull: false },
      end_at: { type: Sequelize.DATE, allowNull: false },
      max_attempts: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      pass_mark: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      shuffle_questions: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      status: {
        type: Sequelize.ENUM('draft', 'published', 'closed'),
        allowNull: false,
        defaultValue: 'draft',
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('exams')
  },
}
