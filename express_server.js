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
  return String.fromCharCode(...Array(6).fill(0).map( () => Math.floor(Math.random() * 36)).map( x => x + (x > 9 ? 87 : 48)));
}

// ========= fake database ===========

const urlDatabase = {
  '33zwdo81': 'http://www.lighthouselabs.ca',
  'muvcjqsp': 'http://www.google.com'
};

const users = {
  '6mvm00vd': {
    id: '6mvm00vd',
    email: 'peter@hotcakes.com',
    password: 'purple-monkey-dinosaur'
  },
  'm7i5hivd': {
    id: 'm7i5hivd',
    email: 'susanne@yahoo.fr',
    password: 'machin-chouette'
  }
};

// ========== set up server ==========

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.set('view engine', 'ejs');
app.use(express.static('public'));

// =========== validation ============

function doesEmailExist(email) {
  for (let user in users) {
    if (users[user].email === email ) { console.log(users[user].email); return true; }
  }
  return false;
}

// =============== GET ===============

app.get('/', (req, res) => {
  res.redirect('/urls/new');
});

app.get('/register', (req, res) => {
  res.render('register', { username: null });
});

app.get('/urls', (req, res) => {
  let templateVars = {
    urls: urlDatabase,
    username: req.cookies['username']
  };
  res.render('urls_index', templateVars);
});

app.get('/urls/new', (req, res) => {
  let templateVars = {
    username: req.cookies['username']
  };
  res.render('urls_new', templateVars);
});

app.get('/urls/:id', (req, res) => {
  // to do: validate
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

app.post('/register', (req, res) => {
  let { email, password } = req.body;

  // validate e-mail and password
  if (!email || !password) {
    // email and password should not be empty because the form already validates them. But just in case...
    res.status(400).send('Bad request. How did you get around the form? Maybe you\'re cheating with curl?');
    return;
  }
  if (doesEmailExist(email)) {
    res.status(400).send('That e-mail address already exists.');
    return;
  }

  let randomID = generateRandomString();
  users[randomID] = {
    id: randomID,
    email: email,
    password: password
  };
  res.cookie('user_id', randomID);
  res.redirect('/urls');
});

app.post('/login', (req, res) => {
  res.cookie('username', req.body.username);
  res.redirect('/urls');
});

app.post('/logout', (req, res) => {
  res.clearCookie('username');
  res.redirect('/urls');
});

app.post('/urls', (req, res) => {
  // to do: check if hash key already exists
  let longUrl = req.body.longURL;
  let shortURL = hash(req.body.longURL);
  urlDatabase[shortURL] = longUrl;
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