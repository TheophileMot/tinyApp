# redesigned logic for **logout**

*POST /logout*:

    deletes cookie
    redirects to /urls

... but *GET /urls*:

    returns HTML with a relevant error message

Therefore, according to the behaviour requirements, a user who logs out will get send to a dead end with an error message. Instead of this, I send them back to the **login** page with the 'error' message that they have successfully logged out.

# similar for **login** / **register** errors

Instead of a 403 error, I send the user back to the **login** / **register** page with an appropriate error message.