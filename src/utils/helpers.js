const bcrypt = require('bcrypt');

const hashPassword = async (password) => {
  const hash = await bcrypt.hash(password, 12);
  return hash;
};

const matchPassword = async (password, hash) => {
  const match = await bcrypt.compare(password, hash);
  return match;
};

module.exports = {
  hashPassword, 
  matchPassword
}
