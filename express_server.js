const bodyParser = require('body-parser');
const express = require('express');
const app = express();
const PORT = 8000;

app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

const urlDatabase = {
  'b2xVn2': 'http://www.lighthouselabs.ca',
  '9sm5xK': 'http://www.google.com'
};

// =============== GET ===============

app.get('/', (req, res) => {
  res.end('Hello!');
});

app.get('/urls', (req, res) => {
  let templateVars = { urls: urlDatabase };
  res.render('urls_index', templateVars);
});

app.get('/urls/new', (req, res) => {
  res.render('urls_new');
});

app.get('/urls/:id', (req, res) => {
  let templateVars = { shortURL: req.params.id, longURL: urlDatabase[req.params.id] };
  res.render('urls_show', templateVars);
});

app.get('/urls.json', (req, res) => {
  res.json(urlDatabase);
});

// =============== POST ==============

app.post('/urls', (req, res) => {
  console.log(req.body);  // debug statement to see POST parameters
  res.send('Ok');         // Respond with 'Ok' (we will replace this)
});

// ============== LISTEN =============

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

// ===================================



function generateRandomString() {
  return String.fromCharCode(...Array(6).fill(0).map( () => Math.floor(Math.random() * 36)).map( x => x + (x > 9 ? 55 : 48)));
}