const express = require('express')
const {createUser} = require('./db')
const app = express()
const cors = require('cors')
const port = 5000
const db = require('./db')
db.initDatabase()

app.use(cors())

app.get('/', (req, res) => {
  res.send('Hello World!')
})


app.use(express.json());

app.get('/login', (req, res) => res.send(''))

app.post('/register', async (req, res) => {
  if (await db.userExists({email: req.body.login})) {
    res.send({
      status: false, message: [
        {key: 'login', message: 'Пользователь с таким логином уже существует'}
      ]
    })
    return;
  }
  try {
    await createUser({
      login: req.body.login,
      password: req.body.password
    })
  } catch (e) {
    res.send({status: false})
    return
  }
  res.send({status: true})
})


app.post('/login', async (req, res) => {
  const token = await db.checkLogin({
    login: req.body.login,
    password: req.body.password
  })
  if (token) {
    res.send({status: true, token})
    return
  }
  res.send({status: false})
})

app.get('/user', async (req, res) => {
  console.log(req.headers)
  if (!('authentication' in req.headers)) {
    res.status(400).send({'error': 'Authentication details not provided'})
    return
  }
  const user = await db.getUserInfo({token: req.headers['authentication']})
  console.log(user)
  res.send(user)
  await db.updateTimestamp({id: user.id})
})

app.listen(port, (req, res) => {
  console.log(`Example app listening on port ${port}`)
})


