// todo: add click count
// todo: add date; reset date on update URL
// note: error messages not quite consistent: e.g., /urls/[bad ID] shows its own error message, while other pages are passed errorMsg
// note: makeProperURL is simple for now

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
  keys: ['very secret key', 'please don\'t hack the server'],
  maxAge: 24 * 60 * 60 * 1000
}));
app.set('view engine', 'ejs');
app.use(express.static('public'));




// ======= string manipulation =======

// return string of 8 characters in [0-9][a-z]: to get each character, map a random number in [0-35]
//   to the ASCII code for [0-9] or [a-z].
function generateRandomString() {
  return String.fromCharCode(...Array(8).fill(0).map( () => Math.floor(Math.random() * 36)).map( x => x + (x > 9 ? 87 : 48)));
}

// format a URL by making sure it starts with 'http://' or 'https://'. Otherwise, ambiguous URLs like 'google.ca'
//   might redirect to /localhost/google.ca.
function makeProperURL(url) {
  if (url.match(/^https?:\/\//)) {
    return url;
  } else {
    return 'http://' + url;
  }
}

// elide middle of strings if they are too long (i.e., "[beginning]...[end]")
function abbreviate(str) {
  const MAX_TOLERATED_LENGTH = 60;
  if (str.length < MAX_TOLERATED_LENGTH) {
    return str;
  } else {
    return str.slice(0, MAX_TOLERATED_LENGTH / 2) + '...' + str.slice(-MAX_TOLERATED_LENGTH / 2);
  }
}

// ========= fake databases ==========

// URL database. Typical entry:
//   'cfdulsgp': {
//     owner: 'cfdulsgp',
//     URL: 'http://www.cbc.ca/news/canada/ottawa/u-of-o-student-union-members-under-investigation-for-fraud-1.4780695',
//     abbreviatedURL: 'http://www.cbc.ca/news/canada/...estigation-for-fraud-1.4780695',
//     usedCount: {
//       sinceCreated: 19,
//       sinceLastUpdated: 1
//     }
//     date: {
//       format: function(dateType) { ... },
//       created: (Date object),
//       lastUpdated: (Date object),
//       lastUsed: (Date object)
//     }
//   }
const urlDatabase = {};

// User database. Typical entry:
//   'cfdulsgp': {
//     id: 'cfdulsgp',
//     email: 'a@a.a',
//     hashedPassword: '$2a$10$G49vwTsbvPh10l3PytdvMOZy.cdNeGPfNgFh6L2BwKtFMD/4LI66W'
//   }
const users = {};

// find only those URLs owned by a given user
function filterByID(userID) {
  let result = {};
  for (let shortURL in urlDatabase) {
    if (urlDatabase[shortURL].owner === userID) {
      result[shortURL] = urlDatabase[shortURL];
    }
  }
  return result;
}

// find user ID associated with a given e-mail address
function findIDfromEmail(email) {
  for (let userID in users) {
    if (users[userID].email === email) {
      return userID;
    }
  }
  return undefined;
}

// check whether e-mail exists in database to prevent multiple registration under same address
function doesEmailExist(email) {
  for (let user in users) {
    if (users[user].email === email ) { return true; }
  }
  return false;
}

// =============== GET ===============

// if page isn't specified, redirect to index or log in
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

// show index of user's URLs
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

// show page to create new shortened URL
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

// show page to edit long URL
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

// redirect to long URL, whether user is logged in or not
app.get('/u/:id', (req, res) => {
  const shortURL = req.params.id;
  // first make sure short URL exists in database
  if (!urlDatabase[shortURL]) {
    const userID = req.session.userID;
    if (!users[userID]) {
      req.session.errorMsg = 'Sorry, that shortcut does not exist. Perhaps you would like to log in or register?';
      res.redirect('/login');
    } else {
      req.session.errorMsg = 'Sorry, that shortcut does not exist. Here are your saved shortcuts.';
      res.redirect('/urls');
    }
  } else {
    const longURL = urlDatabase[shortURL].URL;
    urlDatabase[shortURL].usedCount.sinceCreated += 1;
    urlDatabase[shortURL].usedCount.sinceLastUpdated += 1;
    urlDatabase[shortURL].date.lastUsed = new Date();
    res.redirect(longURL);
  }
});

app.get('/urls.json', (req, res) => {
  res.json(urlDatabase);
});

// catch all other GET requests (these are all invalid; redirect to home)
app.get(/./, (req, res) => {
  res.redirect('/');
});

// =============== POST ==============

app.post('/register', (req, res) => {
  const { email, password } = req.body;

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

// create a URL
app.post('/urls', (req, res) => {
  const userID = req.session.userID;

  // make sure user is logged in
  if (!users[userID]) {
    req.session.errorMsg = 'Please log in or register.';
    res.redirect('/login');
  } else {
    const longURL = makeProperURL(req.body.longURL);
    let shortURL = generateRandomString();
    while (urlDatabase[shortURL]) {
      shortURL = generateRandomString();
    }
    urlDatabase[shortURL] = {
      owner: userID,
      URL: longURL,
      abbreviatedURL: abbreviate(longURL),
      usedCount: {
        sinceCreated: 0,
        sinceLastUpdated: 0
      },
      date: {
        format: function(dateType) {
          const date = this[dateType];
          if (date) {
            const now = new Date();
            if (now - date < 10 * 1000) {
              return 'a few seconds ago';
            } else if (now - date < 60 * 1000) {
              return 'less than a minute ago';
            } else if ((now - date < 24 * 60 * 60 * 1000) && now.getDate() === date.getDate()) {
              return 'today at ' + date.getHours() + ':' + date.getMinutes().toString().padStart(2, '0');
            } else {
              return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate()
                + ' at ' + date.getHours() + ':' + date.getMinutes().toString().padStart(2, '0');
            }
          } else {
            return '';
          }
        },
        created: new Date(),
        lastUpdated: null,
        lastUsed: null
      }
    };
    res.redirect('/urls/' + shortURL);
  }
});

// update a URL; adjust related statistics in database
app.post('/urls/:id', (req, res) => {
  const userID = req.session.userID;

  // make sure user is logged in and owns the URL
  if (!users[userID]) {
    req.session.errorMsg = 'Please log in or register.';
    res.redirect('/login');
  } else {
    const shortURL = req.body.shortURL;
    const longURL = makeProperURL(req.body.longURL);
    if (!urlDatabase[shortURL] || urlDatabase[shortURL].owner !== userID) {
      req.session.errorMsg = 'Sorry, you cannot edit that URL.';
      res.redirect('/urls/');
    } else {
      // check to see if there was any change; if not, don't adjust statistics
      if (urlDatabase[shortURL].URL !== longURL) {
        urlDatabase[shortURL].URL = longURL;
        urlDatabase[shortURL].abbreviatedURL = abbreviate(longURL);
        urlDatabase[shortURL].usedCount.sinceLastUpdated = 0;
        urlDatabase[shortURL].date.lastUpdated = new Date();
      }
      res.redirect('/urls/' + shortURL);
    }
  }
});

// delete a URL
app.post('/urls/:id/delete', (req, res) => {
  const userID = req.session.userID;

  // make sure user is logged in and owns the URL
  if (!users[userID]) {
    req.session.errorMsg = 'Please log in or register.';
    res.redirect('/login');
  } else {
    const shortURL = req.params.id;
    if (!urlDatabase[shortURL] || urlDatabase[shortURL].owner !== userID) {
      req.session.errorMsg = 'Sorry, you cannot delete that URL.';
      res.redirect('/urls/');
    } else {
      delete urlDatabase[shortURL];
      req.session.errorMsg = 'URL deleted.';
      res.redirect('/urls');
    }
  }
});

// ============== LISTEN =============

app.listen(PORT, () => {
  console.log(`TinyApp listening on port ${PORT}!`);
});