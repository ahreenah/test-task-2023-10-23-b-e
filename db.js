const sqlite = require('sqlite3')
const bcrypt = require('bcrypt')

const db = new sqlite.Database('db.db', sqlite.OPEN_READ_WRITE);
module.exports.initDatabase =
  () => {
    //  db.getDatabaseInstance().serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        login TEXT UNIQUE,
        password TEXT,
        create_timestamp DATETIME,
        update_timestamp DATETIME 
      );
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS auth (
        token STRING,
        user INTEGER,
        FOREIGN KEY (user) REFERENCES users(id)
      );
    `)
    console.log('created db')
    //  });
  }


module.exports.db = db;

module.exports.createUser = async ({login, password}) => {
  const salt = await bcrypt.genSalt(10)
  const passwordHash = await bcrypt.hash(password, salt)
  console.log('hash', passwordHash)
  const stmt = db.prepare("INSERT INTO users (login, password, create_timestamp, update_timestamp) VALUES (?, ?, ?, ?)");
  stmt.run(login, passwordHash, new Date(), new Date());
  stmt.finalize();
}

module.exports.checkLogin = async ({login, password}) => {
  /*  const user = await db.query("SELECT * FROM users WHERE login = (?)", [login], (...res) => {
      console.log('in', res)
    })*/
  const user = await new Promise((resolve, reject) => {
    db.all("SELECT * FROM users WHERE login = (?) LIMIT 1", [login], (err, rows) => {
      if (err) reject(err)
      resolve(rows[0])
    })
  })
  if (!user) return null
  if (await bcrypt.compare(password, user.password)) {
    const stmt = db.prepare("INSERT INTO auth (token, user) VALUES (?, ?)");

    const salt = await bcrypt.genSalt(10)
    const token = await bcrypt.hash(new Date().toString() + new Date().getMilliseconds(), salt)
    stmt.run(token, user.id)
    stmt.finalize()
    return token
  }
  return null
}

module.exports.updateTimestamp = ({id}) => {
  const stmt = db.prepare("UPDATE users SET update_timestamp=(?) WHERE id=(?)");
  stmt.run(new Date(), id)
  stmt.finalize()
}

module.exports.getUserInfo = async ({token}) => {

  const user = await new Promise((resolve, reject) => {
    db.all("SELECT * FROM auth JOIN users ON auth.user = users.id WHERE auth.token = (?) LIMIT 1", [token], (err, rows) => {
      if (err) reject(err)
      resolve(rows[0])
    })
  })

  console.log('found user', user)

  return user
}

module.exports.userExists = async ({email}) => {

  const user = await new Promise((resolve, reject) => {
    db.all("SELECT * FROM users WHERE login = (?) LIMIT 1", [email], (err, rows) => {
      if (err) reject(err)
      resolve(rows?.length > 0)
    })
  })

  console.log('found user', user)

  return user
}
