// users.js

const USERS = {
  admin: 'admin', //replace with your username and password
};

function validateUser(username, password) {
  return USERS[username] && USERS[username] === password;
}

module.exports = {
  USERS,
  validateUser,
};
