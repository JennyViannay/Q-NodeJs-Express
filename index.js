const express = require('express');
const bodyParser = require('body-parser');
const Joi = require('joi');
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
    const { firstname, lastname, email } = req.body;
    const db = connection.promise();
    let validateErrors = null;
    db.query("SELECT * FROM user WHERE email = ?", [email])
        .then(([result]) => {
            if (result[0]) return Promise.reject('DUPLICATE_EMAIL');
            validateErrors = Joi.object({
                email: Joi.string().email().max(255).required(),
                firstname: Joi.string().max(255).required(),
                lastname: Joi.string().max(255).required()
            }).validate({ firstname, lastname, email }, { abortEarly: false }).error;
            if (validateErrors) return Promise.reject('INVALID_DATA');
            return db.query(
                'INSERT INTO user (firstname, lastname, email) VALUES (?, ?, ?)',
                [firstname, lastname, email]
            );
        })
        .then(([{ insertId }]) => {
            res.status(201).json({ id: insertId, firstname, lastname, email });
        })
        .catch((err) => {
            console.error(err);
            if (err === 'DUPLICATE_EMAIL')
                res.status(409).json({ message: 'This email is already used' });
            else if (err === 'INVALID_DATA')
                res.status(422).json({ validateErrors });
            else res.status(500).send('Error saving the user');
        });
});

/**
 * Put | Update User
 */
app.put("/api/users/:id", (req, res) => {
    const userId = req.params.id;
    const db = connection.promise();
    let existingUser = null;
    db.query('SELECT * FROM user WHERE id = ?', [userId])
        .then(([results]) => {
            existingUser = results[0];
            if (!existingUser) return Promise.reject('RECORD_NOT_FOUND');
            return db.query('UPDATE user SET ? WHERE id = ?', [req.body, userId]);
        })
        .then(() => {
            res.status(200).json({ ...existingUser, ...req.body });
        })
        .catch((err) => {
            console.error(err);
            if (err === 'RECORD_NOT_FOUND') res.status(404).send(`User with id ${userId} not found.`);
            else res.status(500).send('Error updating a user');
        });
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
    if (req.query.color) {
        sql += ' WHERE color = ?';
        sqlValues.push(req.query.color);
    }
    if (req.query.max_duration) {
        if (req.query.color) sql += ' AND duration <= ? ;';
        else sql += ' WHERE duration <= ?';
        sqlValues.push(req.query.max_duration);
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
    const { title, director, year, color, duration } = req.body;
    const db = connection.promise();
    let validateErrors = null;
    db.query("SELECT * FROM movies WHERE title = ?", [title])
        .then(([result]) => {
            if (result[0]) return Promise.reject('DUPLICATE_ENTRY');
            validateErrors = Joi.object({
                title: Joi.string().max(255).required(),
                director: Joi.string().max(255).required(),
                year: Joi.string().max(255).required(),
                color: Joi.number().required(),
                duration: Joi.number().required(),
            }).validate({ title, director, year, color, duration }, { abortEarly: false }).error;
            if (validateErrors) return Promise.reject('INVALID_DATA');
            return db.query(
                'INSERT INTO movies (title, director, year, color, duration) VALUES (?, ?, ?, ?, ?)',
                [title, director, year, color, duration]
            );
        })
        .then(([{ insertId }]) => {
            res.status(201).json({ id: insertId, title, director, year, color, duration });
        })
        .catch((err) => {
            console.log(err)
            if (err === 'DUPLICATE_ENTRY') res.status(409).json({ message: "This title is already exist" });
            else if (err === 'INVALID_DATA') res.status(422).json({ validateErrors });
            else res.status(500).send('Error saving the movie');
        });
});

/**
 * Put | Update Movie
 */
app.put("/api/movies/:id", (req, res) => {
    const movieId = req.params.id;
    const db = connection.promise();
    let existingMovie = null;
    db.query('SELECT * FROM movies WHERE id = ?', [movieId])
        .then(([results]) => {
            existingMovie = results[0];
            if (!existingMovie) return Promise.reject('RECORD_NOT_FOUND');
            return db.query('UPDATE movies SET ? WHERE id = ?', [req.body, movieId]);
        })
        .then(() => {
            res.status(200).json({ ...existingMovie, ...req.body });
        })
        .catch((err) => {
            console.error(err);
            if (err === 'RECORD_NOT_FOUND') res.status(404).send(`Movie with id ${userId} not found.`);
            else res.status(500).send('Error updating a movie');
        });
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
