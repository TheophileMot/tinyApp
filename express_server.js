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

// ========= fake databases ==========

// const urlDatabase = {
//   '33zwdo81': {
//     user: '6mvm00vd',
//     URL: http://www.lighthouselabs.ca'
//   }, ... }
const urlDatabase = {};

// const users = {
//   '6mvm00vd': {
//     id: '6mvm00vd',
//     email: 'peter@hotcakes.com',
//     password: 'purple-monkey-dinosaur'
//   }, ... }
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
  if (users[req.cookies.userID]) {
    res.redirect('/');
  } else {
    res.render('register', { email: null });
  }
});

app.get('/login', (req, res) => {
  if (users[req.cookies.userID]) {
    res.redirect('/');
  } else {
    res.render('login', { email: null });
  }
});

app.get('/urls', (req, res) => {
  if (!users[req.cookies.userID]) {
    res.redirect('/login');
  } else {
    let templateVars = {
      urls: urlDatabase,
      email: users[req.cookies.userID].email
    };
    res.render('urls_index', templateVars);
  }
});

app.get('/urls/new', (req, res) => {
  // make user log in before they can shorten a new URL
  if (!users[req.cookies.userID]) {
    res.redirect('/login');
  } else {
    let templateVars = {
      email: users[req.cookies.userID].email
    };

    res.render('urls_new', templateVars);
  }
});

app.get('/urls/:id', (req, res) => {
  // redirect to start page if short URL doesn't exist in database
  if (!urlDatabase[req.params.id]) {
    res.redirect('/');
  } else {
    let templateVars = {
      shortURL: req.params.id,
      longURL: urlDatabase[req.params.id].URL,
      email: users[req.cookies.userID].email
    };
    res.render('urls_show', templateVars);
  }
});

app.get('/u/:shortURL', (req, res) => {
  // redirect to start page if short URL doesn't exist in database
  if (!urlDatabase[req.params.id]) {
    res.redirect('/');
  } else {
    let longURL = urlDatabase[req.params.shortURL].URL;
    res.redirect(longURL);
  }
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
  } else if (doesEmailExist(email)) {
    res.status(400).send('Error: that e-mail address already exists.');
    return;
  } else {
    let userHash = hash(email);
    users[userHash] = {
      id: userHash,
      email: email,
      password: password
    };
    res.cookie('userID', userHash);
    res.redirect('/urls');
  }
});

app.post('/login', (req, res) => {
  let userID = hash(req.body.email);
  if (!users[userID]) {
    res.status(403).send('Error: no such user.');
  } else if (users[userID].password !== req.body.password) {
    res.status(403).send('Error: wrong password.');
  } else {
    res.cookie('userID', userID);
    res.redirect('/');
  }
});

app.post('/logout', (req, res) => {
  res.clearCookie('userID');
  res.redirect('/urls');
});

app.post('/urls', (req, res) => {
  let longURL = req.body.longURL;
  let shortURL = generateRandomString();
  urlDatabase[shortURL] = { user: req.cookies.userID, URL: longURL };
  res.redirect('/urls/' + shortURL);
});

app.post('/urls/:id', (req, res) => {
  // TODO: validate
  let { shortURL, longURL } = req.body;
  urlDatabase[shortURL] = { user: req.cookies.userID, URL: longURL };
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