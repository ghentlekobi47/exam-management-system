const { Course, User } = require('../../models')
const HttpError = require('../../utils/httpError')

function listUsers({ role }) {
  return User.findAll({
    where: role ? { role } : {},
    order: [['fullName', 'ASC']],
  })
}

async function updateUser(id, changes, actingUser) {
  const user = await User.findByPk(id)

  if (!user) {
    throw new HttpError(404, 'User not found')
  }

  // Stops an admin from locking themselves out
  if (user.id === actingUser.id) {
    if (changes.isActive === false) {
      throw new HttpError(400, 'You cannot deactivate your own account')
    }
    if (changes.role && changes.role !== 'admin') {
      throw new HttpError(400, 'You cannot remove your own admin role')
    }
  }

  // A lecturer who still teaches courses must keep the lecturer role
  if (user.role === 'lecturer' && changes.role && changes.role !== 'lecturer') {
    const taughtCourses = await Course.count({ where: { lecturerId: user.id } })
    if (taughtCourses > 0) {
      throw new HttpError(409, 'This lecturer still teaches courses; reassign them first')
    }
  }

  await user.update(changes)
  return user
}

module.exports = { listUsers, updateUser }
