const express = require('express');
const bodyParser = require('body-parser');
const connection = require("./db-config");
const app = express();

app.use(express.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

//--------------------------------------------------------------------------------------------------------------- //
//--------------------------------------------------------------------------------------------------------------- //
//--------------------------------------------------------------------------------------------------------------- //
// --------------------------------------------------- Users ---------------------------------------------------- //

/**
 * Get Users with with optional query (language) 
 */
app.get('/api/users', (req, res) => {
    let sql = 'SELECT * FROM users';
    const sqlValues = [];
    if (req.query.language) {
        sql += ' WHERE language = ?';
        sqlValues.push(req.query.language);
    }
    connection.query(sql, sqlValues, (err, results) => {
        if (err) {
            console.log(err);
            res.status(500).send('Error retrieving users from database');
        } else {
            res.json(results);
        }
    });
});

/**
 * Get User by ID 
 */
app.get('/api/users/:id', (req, res) => {
    const userId = req.params.id;
    connection.query("SELECT * FROM user WHERE id = ?", [userId], (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).send(`An error occurred: ${err.message}`);
        }
        else {
            if (result.length) res.status(200).send(result[0]);
            else res.status(404).send("User not found");
        }
    });
});

/**
 * Post User
 */
app.post('/api/users', (req, res) => {
    console.log(req.body)
    const { firstname, lastname } = req.body;
    connection.query(
        'INSERT INTO user (firstname, lastname) VALUES (?, ?)',
        [firstname, lastname],
        (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).send('Error saving the user');
            } else {
                const id = result.insertId;
                const createdUser = { id, firstname, lastname };
                res.status(201).json(createdUser);
            }
        }
    );
});

/**
 * Put | Update User
 */
app.put("/api/users/:id", (req, res) => {
    const userId = req.params.id;
    const userPropsToUpdate = req.body;
    console.log(userId);
    connection.query(
        'UPDATE user SET ? WHERE id = ?',
        [userPropsToUpdate, userId],
        (err) => {
            if (err) {
                console.log(err);
                res.status(500).send('Error updating a user');
            } else {
                connection.query("SELECT * FROM user WHERE id = ?", [userId], (err, result) => {
                    res.status(200).send(result[0]);
                });
            }
        }
    );
});

/**
 * Delete User by ID
 */
app.delete("/api/users/:id", (req, res) => {
    const userId = req.params.id;
    connection.query("DELETE FROM user WHERE id = ?", [userId], (err) => {
        if (err) {
            console.log(err);
            res.status(500).send("😱 Error deleting an user");
        } else {
            res.status(200).send("🎉 User deleted!");
        }
    });
});

//--------------------------------------------------------------------------------------------------------------- //
//--------------------------------------------------------------------------------------------------------------- //
//--------------------------------------------------------------------------------------------------------------- //
// --------------------------------------------------- Movies --------------------------------------------------- //

/**
 * Get Movies with optional query (duration and|or color)
 */
app.get("/api/movies", (req, res) => {
    let sql = 'SELECT * FROM movies';
    const sqlValues = [];
    if (req.query.max_duration && req.query.color) {
        sql += ' WHERE color = ? AND duration < ?';
        sqlValues.push(req.query.color);
        sqlValues.push(req.query.max_duration);
    }
    if (req.query.max_duration && !req.query.color) {
        sql += ' WHERE duration < ?';
        sqlValues.push(req.query.max_duration);
    }
    if (req.query.color && !req.query.max_duration) {
        sql += ' WHERE color = ?';
        sqlValues.push(req.query.color);
    }
    connection.query(sql, sqlValues, (err, results) => {
        if (err) {
            console.log(err);
            res.status(500).send(`Error retrieving movies from database ${err}`);
        } else {
            if (results.length) res.status(200).json(results);
            else res.status(200).send('No movie found in your criteria');
        }
    });
});

/**
 * Get Movie by ID
 */
app.get("/api/movies/:id", (req, res) => {
    const movieId = req.params.id;
    connection.query("SELECT * FROM movies WHERE id = ?", [movieId], (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).send(`An error occurred: ${err.message}`);
        }
        else {
            if (result.length) res.status(200).send(result[0]);
            else res.status(404).send("Movie not found");
        }
    });
});

/**
 * Post Movie
 */
app.post('/api/movies', (req, res) => {
    console.log(req.body)
    const { title, director, year, color, duration } = req.body;
    connection.query(
        'INSERT INTO movies (title, director, year, color, duration) VALUES (?, ?, ?, ?, ?)',
        [title, director, year, color, duration],
        (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).send('Error saving the movie');
            } else {
                const id = result.insertId;
                const createdMovie = { id, title, director, year, color, duration };
                res.status(201).json(createdMovie);
            }
        }
    );
});

/**
 * Put | Update Movie
 */
app.put("/api/movies/:id", (req, res) => {
    const movieId = req.params.id;
    const moviePropsToUpdate = req.body;
    connection.query(
        'UPDATE movies SET ? WHERE id = ?',
        [moviePropsToUpdate, movieId],
        (err) => {
            if (err) {
                console.log(err);
                res.status(500).send('Error updating a movie');
            } else {
                connection.query("SELECT * FROM movies WHERE id = ?", [movieId], (err, result) => {
                    res.status(200).send(result[0]);
                });
            }
        }
    );
});

/**
 * Delete Movie by ID
 */
app.delete("/api/movies/:id", (req, res) => {
    const movieId = req.params.id;
    connection.query("DELETE FROM movies WHERE id = ?", [movieId], (err) => {
        if (err) {
            console.log(err);
            res.status(500).send("😱 Error deleting a movie");
        } else {
            res.status(200).send("🎉 Movie deleted!");
        }
    });
});

/**
 * Get Home 
 */
app.get("/", (request, response) => {
    response.send("Welcome to my favourite movie list");
});

/**
 * Server Listen
 */
app.listen(process.env.SERVER_PORT, () => {
    console.log(`✅  Server is running on ${process.env.SERVER_PORT}`);
});
