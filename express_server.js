const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const express = require('express');
const app = express();
const PORT = 8000;

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
  const userID = req.cookies.userID;

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
  if (!users[req.cookies.userID]) {
    res.redirect('/login');
  } else {
    const templateVars = {
      email: users[req.cookies.userID].email
    };

    res.render('urls_new', templateVars);
  }
});

app.get('/urls/:id', (req, res) => {
  const userID = req.cookies.userID;
  const shortURL = req.params.id;

  if (!users[userID]) {
    // make sure user is logged in
    res.redirect('/login');
  } else if (!urlDatabase[shortURL] || urlDatabase[shortURL].owner !== userID) {
    // give error message if short URL doesn't exist in database, or if URL doesn't belong to user
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
    res.cookie('userID', randomID);
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
    res.cookie('userID', userID);
    res.redirect('/');
  }
});

app.post('/logout', (req, res) => {
  res.clearCookie('userID');
  res.redirect('/urls');
});

app.post('/urls', (req, res) => {
  const longURL = req.body.longURL;
  let shortURL = generateRandomString();
  while (urlDatabase[shortURL]) {
    shortURL = generateRandomString();
  }
  urlDatabase[shortURL] = { owner: req.cookies.userID, URL: longURL };
  res.redirect('/urls/' + shortURL);
});

app.post('/urls/:id', (req, res) => {
  const{ shortURL, longURL } = req.body;
  urlDatabase[shortURL] = { owner: req.cookies.userID, URL: longURL };
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