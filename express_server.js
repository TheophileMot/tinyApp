// todo: add click count
// todo: add date; reset date on update URL
// todo: prefix incomplete URLs with http://
// todo: add regex to catch all other pages
// note: error messages not quite consistent: e.g., /urls/[bad ID] shows its own error message, while other pages are passed errorMsg

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
  maxAge: 24 * 60 * 60 * 1000
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
  const userID = req.session.userID;

  if (users[userID]) {
    res.redirect('/urls');
  } else {
    res.redirect('/login');
  }
});

app.get('/register', (req, res) => {
  const errorMsg = req.session.errorMsg;
  req.session.errorMsg = null;

  if (users[req.session.userID]) {
    res.redirect('/');
  } else {
    res.render('register', { email: null, errorMsg: errorMsg });
  }
});

app.get('/login', (req, res) => {
  const errorMsg = req.session.errorMsg;
  req.session.errorMsg = null;

  if (users[req.session.userID]) {
    res.redirect('/');
  } else {
    res.render('login', { email: null, errorMsg: errorMsg });
  }
});

app.get('/urls', (req, res) => {
  const userID = req.session.userID;
  const errorMsg = req.session.errorMsg;
  req.session.errorMsg = null;

  if (!users[userID]) {
    req.session.errorMsg = 'You must be logged in to see your list of saved URLS. Please log in or register.';
    res.redirect('/login');
  } else {
    const templateVars = {
      urls: filterByID(userID),
      email: users[userID].email,
      errorMsg: errorMsg
    };
    res.render('urls_index', templateVars);
  }
});

app.get('/urls/new', (req, res) => {
  const userID = req.session.userID;

  // make user log in before they can shorten a new URL
  if (!users[userID]) {
    req.session.errorMsg = 'Please log in or register to be able to shorten URLs.';
    res.redirect('/login');
  } else {
    const templateVars = {
      email: users[userID].email
    };

    res.render('urls_new', templateVars);
  }
});

app.get('/urls/:id', (req, res) => {
  const userID = req.session.userID;
  const shortURL = req.params.id;

  // make sure user is logged in
  if (!users[userID]) {
    req.session.errorMsg = 'Please log in or register.';
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
  // redirect if short URL doesn't exist in database
  if (!urlDatabase[req.params.id]) {
    const userID = req.session.userID;
    if (!users[userID]) {
      req.session.errorMsg = 'Sorry, that shortcut does not exist. Perhaps you would like to log in or register?';
      res.redirect('/login');
    } else {
      req.session.errorMsg = 'Sorry, that shortcut does not exist. Here are your saved shortcuts.';
      res.redirect('/urls');
    }
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
    // email and password should not be empty because the form already validates them before POSTing. But just in case...
    // (Let's leave this as a 400 rather than redirecting. Bad user!)
    res.status(400).send('Bad request. How did you get around the form? Maybe you\'re cheating with curl?');
  } else if (doesEmailExist(email)) {
    req.session.errorMsg = 'Error: that e-mail address already exists. Please log in with the correct password or register for a new account.';
    res.redirect('/register');
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
    req.session.errorMsg = 'No such user exists. Please try again or register for a new account.';
    res.redirect('login');
  } else if (!bcrypt.compareSync(req.body.password, users[userID].hashedPassword)) {
    req.session.errorMsg = 'Wrong password! Please try again or register for a new account.';
    res.redirect('login');
  } else {
    req.session.userID = userID;
    res.redirect('/');
  }
});

app.post('/logout', (req, res) => {
  req.session.userID = null;
  req.session.errorMsg = 'You have been logged out.';
  res.redirect('/login');
});

app.post('/urls', (req, res) => {
  const userID = req.session.userID;

  // make sure user is logged in
  if (!users[userID]) {
    req.session.errorMsg = 'Please log in or register.';
    res.redirect('/login');
  } else {
    const longURL = req.body.longURL;
    let shortURL = generateRandomString();
    while (urlDatabase[shortURL]) {
      shortURL = generateRandomString();
    }
    urlDatabase[shortURL] = { owner: req.session.userID, URL: longURL };
    res.redirect('/urls/' + shortURL);
  }
});

// update an URL
app.post('/urls/:id', (req, res) => {
  const userID = req.session.userID;

  // make sure user is logged in and owns the URL
  if (!users[userID]) {
    req.session.errorMsg = 'Please log in or register.';
    res.redirect('/login');
  } else {
    const{ shortURL, longURL } = req.body;
    if (!urlDatabase[shortURL] || urlDatabase[shortURL].owner !== userID) {
      req.session.errorMsg = 'Sorry, you cannot edit that URL.';
      res.redirect('/urls/');
    } else {
      urlDatabase[shortURL] = { owner: req.session.userID, URL: longURL };
      res.redirect('/urls/' + shortURL);
    }
  }
});

app.post('/urls/:id/delete', (req, res) => {
  const userID = req.session.userID;

  // make sure user is logged in and owns the URL
  if (!users[userID]) {
    req.session.errorMsg = 'Please log in or register.';
    res.redirect('/login');
  } else {
    const{ shortURL, longURL } = req.body;
    if (!urlDatabase[shortURL] || urlDatabase[shortURL].owner !== userID) {
      req.session.errorMsg = 'Sorry, you cannot delete that URL.';
      res.redirect('/urls/');
    } else {
      delete urlDatabase[req.params.id];
      res.redirect('/urls');
    }
  }
});

// ============== LISTEN =============

app.listen(PORT, () => {
  console.log(`TinyApp listening on port ${PORT}!`);
});