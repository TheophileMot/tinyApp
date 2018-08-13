# tinyApp URL shortener

tinyApp is a full stack web application built with Node and Express that allows users to shorten long URLs and track how many times these shortcuts are used.

## Screenshots



## Dependencies

- Node
- Express
- EJS
- bcrypt
- body-parser
- cookie-session

## Getting started

- Install all dependencies (`npm install`)
- Run the server (`node express_server.js`)

## Usage and features

The application is pretty self-explanatory: users can log in to be able to shorten URLs; they can edit them and track basic statistics (date of creation, number of times the link was followed, etc.).

The dates are presented in a user-friendly format (e.g., "a few seconds ago", or "today at 13:05" instead of "2018-08-12 at 13:05").

Particularly long URLs are abbreviated in the index to save space (e.g., "httр://www.abcde...xyz.com").

To avoid shenanigans, all URLs must start with "http://" or "https://"; the former is automatically added as a prefix if necessary.