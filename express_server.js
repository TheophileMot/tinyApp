const bodyParser = require('body-parser');
const express = require('express');
const cookieParser = require('cookie-parser');
const app = express();
const PORT = 8000;


function generateRandomString() {
  return String.fromCharCode(...Array(6).fill(0).map( () => Math.floor(Math.random() * 36)).map( x => x + (x > 9 ? 55 : 48)));
}

// ========= server methods ==========

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.set('view engine', 'ejs');

const urlDatabase = {
  'b2xVn2': 'http://www.lighthouselabs.ca',
  '9sm5xK': 'http://www.google.com'
};

// =============== GET ===============

app.get('/', (req, res) => {
  res.redirect('/urls/new');
});

app.get('/urls', (req, res) => {
  let templateVars = {
    urls: urlDatabase,
    username: req.cookies['username']
  };
  console.log(templateVars);
  res.render('urls_index', templateVars);
});

app.get('/urls/new', (req, res) => {
  let templateVars = {
    username: req.cookies['username']
  };
  res.render('urls_new', templateVars);
});

app.get('/urls/:id', (req, res) => {
  let templateVars = {
    shortURL: req.params.id,
    longURL: urlDatabase[req.params.id],
    username: req.cookies['username']
  };
  res.render('urls_show', templateVars);
});

app.get('/u/:shortURL', (req, res) => {
  let longURL = urlDatabase[req.params.shortURL];
  res.redirect(longURL);
});

app.get('/urls.json', (req, res) => {
  res.json(urlDatabase);
});

// =============== POST ==============

app.post('/login', (req, res) => {
  res.cookie('username', req.body.username);
  res.redirect('/urls');
});


app.post('/urls', (req, res) => {
  // to do: check if hash key already exists
  let shortURL = generateRandomString();
  urlDatabase[shortURL] = req.body.longURL;
  res.redirect('/urls/' + shortURL);
});

app.post('/urls/:id', (req, res) => {
  // to do: validate
  let { shortURL, longURL } = req.body;
  urlDatabase[shortURL] = longURL;
  res.redirect('/urls/' + shortURL);
});


app.post('/urls/:id/delete', (req, res) => {
  delete urlDatabase[req.params.id];
  res.redirect('/urls');
});


// ============== LISTEN =============

app.listen(PORT, () => {
  console.log(`TinyApp listening on port ${PORT}!`);
});