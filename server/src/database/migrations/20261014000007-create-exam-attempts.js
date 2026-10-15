'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('exam_attempts', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      exam_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'exams', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      student_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      attempt_number: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      started_at: { type: Sequelize.DATE, allowNull: false },
      submitted_at: { type: Sequelize.DATE, allowNull: true },
      score: { type: Sequelize.DECIMAL(6, 2), allowNull: true },
      status: {
        type: Sequelize.ENUM('in_progress', 'submitted', 'expired'),
        allowNull: false,
        defaultValue: 'in_progress',
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    })

    await queryInterface.addIndex('exam_attempts', ['exam_id', 'student_id', 'attempt_number'], {
      unique: true,
      name: 'exam_attempts_exam_student_attempt_unique',
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('exam_attempts')
  },
}
