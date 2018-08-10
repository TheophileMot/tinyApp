const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const express = require('express');
const app = express();
const PORT = 8000;

// ========== set up server ==========

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieSession({
  name: 'session',
  keys: ['kind of secret', 'please don\'t hack the server'],
  maxAge: 10 * 60 * 1000
}));
app.set('view engine', 'ejs');
app.use(express.static('public'));




// ======= string generation =========

// return string of 8 characters in [0-9][a-z]
function generateRandomString() {
  return String.fromCharCode(...Array(8).fill(0).map( () => Math.floor(Math.random() * 36)).map( x => x + (x > 9 ? 87 : 48)));
}

// ========= fake databases ==========

const urlDatabase = {
  '33zwdo81': {
    owner: 'cfdulsgp',
    URL: 'http://www.lighthouselabs.ca'
  }
};

function filterByID(userID) {
  let result = {};
  for (let shortURL in urlDatabase) {
    if (urlDatabase[shortURL].owner === userID) {
      result[shortURL] = urlDatabase[shortURL];
    }
  }
  return result;
}

const users = {
  'cfdulsgp': {
    id: 'cfdulsgp',
    email: 'a@a.a',
    hashedPassword: '$2a$10$G49vwTsbvPh10l3PytdvMOZy.cdNeGPfNgFh6L2BwKtFMD/4LI66W'
  }
};

function findIDfromEmail(email) {
  for (let userID in users) {
    if (users[userID].email === email) {
      return userID;
    }
  }
  return undefined;
}

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
  if (users[req.session.userID]) {
    res.redirect('/');
  } else {
    res.render('register', { email: null });
  }
});

app.get('/login', (req, res) => {
  if (users[req.session.userID]) {
    res.redirect('/');
  } else {
    res.render('login', { email: null });
  }
});

app.get('/urls', (req, res) => {
  const userID = req.session.userID;

  if (!users[userID]) {
    res.redirect('/login');
  } else {
    const templateVars = {
      urls: filterByID(userID),
      email: users[userID].email
    };
    res.render('urls_index', templateVars);
  }
});

app.get('/urls/new', (req, res) => {
  // make user log in before they can shorten a new URL
  if (!users[req.session.userID]) {
    res.redirect('/login');
  } else {
    const templateVars = {
      email: users[req.session.userID].email
    };

    res.render('urls_new', templateVars);
  }
});

app.get('/urls/:id', (req, res) => {
  const userID = req.session.userID;
  const shortURL = req.params.id;

  // make sure user is logged in
  if (!users[userID]) {
    res.redirect('/login');
  // give error message if short URL doesn't exist in database, or if URL doesn't belong to user
  } else if (!urlDatabase[shortURL] || urlDatabase[shortURL].owner !== userID) {
    const templateVars = {
      shortURL: null,
      longURL: null,
      email: users[userID].email
    };
    res.render('urls_show', templateVars);

  } else {
    const templateVars = {
      shortURL: shortURL,
      longURL: urlDatabase[shortURL].URL,
      email: users[userID].email
    };
    res.render('urls_show', templateVars);
  }
});

app.get('/u/:id', (req, res) => {
  // redirect to start page if short URL doesn't exist in database
  if (!urlDatabase[req.params.id]) {
    res.redirect('/');
  } else {
    const longURL = urlDatabase[req.params.id].URL;
    res.redirect(longURL);
  }
});

app.get('/urls.json', (req, res) => {
  res.json(urlDatabase);
});

// =============== POST ==============

app.post('/register', (req, res) => {
  const{ email, password } = req.body;

  // validate e-mail and password
  if (!email || !password) {
    // email and password should not be empty because the form already validates them. But just in case...
    res.status(400).send('Bad request. How did you get around the form? Maybe you\'re cheating with curl?');
    return;
  } else if (doesEmailExist(email)) {
    res.status(400).send('Error: that e-mail address already exists.');
    return;
  } else {
    let randomID = generateRandomString();
    while (users[randomID]) {
      randomID = generateRandomString();
    }
    const hashedPassword = bcrypt.hashSync(password, 10);
    users[randomID] = {
      id: randomID,
      email: email,
      hashedPassword: hashedPassword
    };
    req.session.userID = randomID;
    res.redirect('/urls');
  }
});

app.post('/login', (req, res) => {
  const userID = findIDfromEmail(req.body.email);
  if (!userID) {
    res.status(403).send('Error: no such user.');
  } else if (!bcrypt.compareSync(req.body.password, users[userID].hashedPassword)) {
    res.status(403).send('Error: wrong password.');
  } else {
    req.session.userID = userID;
    res.redirect('/');
  }
});

app.post('/logout', (req, res) => {
  req.session.userID = null;
  res.redirect('/urls');
});

app.post('/urls', (req, res) => {
  const longURL = req.body.longURL;
  let shortURL = generateRandomString();
  while (urlDatabase[shortURL]) {
    shortURL = generateRandomString();
  }
  urlDatabase[shortURL] = { owner: req.session.userID, URL: longURL };
  res.redirect('/urls/' + shortURL);
});

app.post('/urls/:id', (req, res) => {
  const{ shortURL, longURL } = req.body;
  urlDatabase[shortURL] = { owner: req.session.userID, URL: longURL };
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