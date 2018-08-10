const bodyParser = require('body-parser');
const express = require('express');
const cookieParser = require('cookie-parser');
const app = express();
const PORT = 8000;

// big integer module for hash function
const bigInt = require('big-integer');

// ======= string generation =========

// very basic hash function (not cryptograpically secure!) for URLs
let hash = (function() {
  // First generate an array of primes deterministically. (These could just be hardcoded.)
  console.log('Precomputing some prime numbers...');
  const primes = [];
  const NUM_PRIMES = 200;
  const MODULUS = bigInt(36).pow(8);
  const THRESHOLD = bigInt(2).pow(24);

  // calculate some primes, making sure that each one is big (≥ THRESHOLD) mod MODULUS
  let p = bigInt(5);
  for (let i = 0; i < NUM_PRIMES; i++) {
    while (!p.isPrime() || p.mod(MODULUS).lt(THRESHOLD)) { p = p = p.modPow(2, MODULUS); }
    primes.push(p);
    p = p.modPow(2, MODULUS);
  }

  return function(str) {
    let sum = bigInt(0);
    // split str into an array of its char codes; multiply each one by the corresponding prime, add to sum, then square mod MODULUS
    let charCodes = str.split('').map( c => c.charCodeAt() );
    for (let i in charCodes) {
      sum = sum.plus(bigInt(charCodes[i]).times(primes[i]));
      sum = sum.modPow(2, MODULUS);
    }
    return sum.toString(36);
  };
}());

function generateRandomString() {
  return String.fromCharCode(...Array(8).fill(0).map( () => Math.floor(Math.random() * 36)).map( x => x + (x > 9 ? 87 : 48)));
}

// ========= fake database ===========

const urlDatabase = {};

const users = {};

// ========== set up server ==========

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.set('view engine', 'ejs');
app.use(express.static('public'));

// =========== validation ============

function doesEmailExist(email) {
  for (let user in users) {
    if (users[user].email === email ) { return true; }
  }
  return false;
}

// =============== GET ===============

app.get('/', (req, res) => {
  res.redirect('/urls/new');
});

app.get('/register', (req, res) => {
  if (req.cookies.userID) {
    res.redirect('/');
  }
  res.render('register', { user: null });
});

app.get('/login', (req, res) => {
  if (req.cookies.userID) {
    res.redirect('/');
  }
  res.render('login', { user: null });
});

app.get('/urls', (req, res) => {
  let templateVars = {
    urls: urlDatabase,
    user: users[req.cookies.userID]
  };
  res.render('urls_index', templateVars);
});

app.get('/urls/new', (req, res) => {
  // make user log in before they can shorten a new URL
  if (!req.cookies.userID) {
    res.redirect('/login');
  }
  let templateVars = {
    user: users[req.cookies.userID]
  };

  res.render('urls_new', templateVars);
});

app.get('/urls/:id', (req, res) => {
  // TODO: validate
  let templateVars = {
    shortURL: req.params.id,
    longURL: urlDatabase[req.params.id],
    user: users[req.cookies.userID]
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

app.post('/register', (req, res) => {
  let { email, password } = req.body;

  // validate e-mail and password
  if (!email || !password) {
    // email and password should not be empty because the form already validates them. But just in case...
    res.status(400).send('Bad request. How did you get around the form? Maybe you\'re cheating with curl?');
    return;
  }
  if (doesEmailExist(email)) {
    res.status(400).send('Error: that e-mail address already exists.');
    return;
  }

  let userHash = hash(email);
  users[userHash] = {
    id: userHash,
    email: email,
    password: password
  };
  res.cookie('userID', userHash);
  res.redirect('/urls');
});

app.post('/login', (req, res) => {
  let userID = hash(req.body.email);
  if (!users[userID]) {
    res.status(403).send('Error: no such user.');
  }
  if (users[userID].password !== req.body.password) {
    res.status(403).send('Error: wrong password.');
  }

  res.cookie('userID', userID);
  res.redirect('/');
});

app.post('/logout', (req, res) => {
  res.clearCookie('userID');
  res.redirect('/urls');
});

app.post('/urls', (req, res) => {
  let longURL = req.body.longURL;
  let shortURL = generateRandomString();
  urlDatabase[shortURL] = longURL;
  res.redirect('/urls/' + shortURL);
});

app.post('/urls/:id', (req, res) => {
  // TODO: validate
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