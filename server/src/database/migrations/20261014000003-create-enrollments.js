'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('enrollments', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      course_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'courses', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      student_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    })

    await queryInterface.addIndex('enrollments', ['course_id', 'student_id'], {
      unique: true,
      name: 'enrollments_course_student_unique',
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('enrollments')
  },
}
