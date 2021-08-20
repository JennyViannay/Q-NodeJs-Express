const express = require('express');
const cors = require('cors');

const connection = require('./db-config');
const jwt = require('jsonwebtoken');

const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const bcrypt = require('bcrypt');
const saltRounds = 10;

const Joi = require('joi');

const app = express();

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

app.use(cookieParser());
app.use(session({
    key: 'userId',
    secret: 'subscribe',
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 60 * 60 * 24,
    },
}));

//--------------------------------------------------------------------------------------------------------------- //
//--------------------------------------------------------------------------------------------------------------- //
//--------------------------------------------------------------------------------------------------------------- //
// --------------------------------------------------- Auth ---------------------------------------------------- //

/**
 * Register User
 */
app.post('/api/register', (req, res) => {
    const { email, password } = req.body;
    const db = connection.promise();
    let validateErrors = null;

    db.query("SELECT * FROM jwt WHERE email = ?", [email])
        .then(([result]) => {
            if (result[0]) return Promise.reject('DUPLICATE_EMAIL');
            validateErrors = Joi.object({
                email: Joi.string().email().max(255).required(),
                password: Joi.string().max(255).required(),
            }).validate({ email, password }, { abortEarly: false }).error;
            if (validateErrors) return Promise.reject('INVALID_DATA');
            return db.query(
                'INSERT INTO jwt (email, password) VALUES (?, ?)',
                [email, bcrypt.hashSync(password, saltRounds)]
            );
        })
        .then(([{ insertId }]) => {
            const token = jwt.sign({ insertId }, "jwtSecret", {
                expiresIn: '365d',
            })
            req.session.user = insertId;
            res.status(202).json({ auth: true, token: token, user: insertId });
        })
        .catch((err) => {
            if (err === 'DUPLICATE_EMAIL') res.json({ message: 'This email is already used' }).status(409);
            else if (err === 'INVALID_DATA') res.json({ validateErrors }).status(422);
            else res.status(500).send('Error saving the user');
        });
});

/**
 * Login User
 */
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const db = connection.promise();

    db.query("SELECT * FROM jwt WHERE email = ?", [email])
        .then(([result]) => {
            if (!result[0]) return Promise.reject('INVALID_EMAIL');
            if (!bcrypt.compareSync(password, result[0].password)) return Promise.reject('INVALID_PASSWORD');
            const userId = result[0].email;
            const token = jwt.sign({ userId }, "jwtSecret", {
                expiresIn: '365d',
            })
            req.session.user = result[0]
            return [result[0], token];
        })
        .then(([user, token]) => {
            res.status(202).json({ auth: true, token: token, user: user });
        })
        .catch((err) => {
            if (err === 'INVALID_EMAIL') res.json({ message:'Email doesn\'t exist' }).status(401);
            else if (err === 'INVALID_PASSWORD') res.json({ message: 'Wrong password !' }).status(409);
            else res.send('Error authenticate user').status(500);
        });
});

/**
 * Get isLogin User
 */
app.get('/api/login', (req, res) => {
    if (req.session.user) res.send({ auth: true, user: req.session.user });
    else res.send({ auth: false });
})

/**
 * MiddleWare verifyJWT
 */
const verifyJWT = (req, res, next) => {
    const token = req.headers["x-access-token"];
    if (!token) res.send("You need a token, please give it to us next time!");
    else jwt.verify(token, "jwtSecret", (err, decoded) => {
        if (err) res.json({ auth: false, message: "You failed to authenticate", err: err });
        else req.userId = decoded.id; next();
    })
};

/**
 * Verify if User is Authenticate
 */
app.get('/api/isUserAuth', verifyJWT, (req, res) => {
    res.send('You are login, congrats !');
});

/**
 * Logout User
 */
app.get('/api/logout', (req, res) => {
    if (req.session.user) req.session.destroy(() => {
        res.status(204).send('You are logout !');
    });
    else res.status(404).send('lost');
});

//--------------------------------------------------------------------------------------------------------------- //
//--------------------------------------------------------------------------------------------------------------- //
//--------------------------------------------------------------------------------------------------------------- //
// --------------------------------------------------- Users ---------------------------------------------------- //

/**
 * Get Users with with optional query (language) 
 */
app.get('/api/users', (req, res) => {
    let sql = 'SELECT * FROM user';
    const sqlValues = [];
    if (req.query.language) {
        sql += ' WHERE language = ?';
        sqlValues.push(req.query.language);
    }
    connection.query(sql, sqlValues, (err, results) => {
        if (err) res.status(500).send('Error retrieving users from database');
        else res.status(200).json(results);
    });
});

/**
 * Get User by ID 
 */
app.get('/api/users/:id', (req, res) => {
    const userId = req.params.id;
    connection.query("SELECT * FROM jwt WHERE id = ?", [userId], (err, result) => {
        if (err) res.send(`An error occurred: ${err.message}`).status(500);
        else
            if (result.length) res.status(200).json(result[0]);
            else res.status(404).send('User not found');
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
        if (err) res.status(500).send('😱 Error deleting an user');
        else res.status(200).send('🎉 User deleted!');
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
        if (err)
            res.status(500).send(`Error retrieving movies from database ${err}`);
        else
            if (results.length) res.status(200).json(results);
            else res.status(200).send('No movie found in your criteria');
    });
});

/**
 * Get Movie by ID
 */
app.get("/api/movies/:id", (req, res) => {
    const movieId = req.params.id;
    connection.query("SELECT * FROM movies WHERE id = ?", [movieId], (err, result) => {
        if (err) res.status(500).send(`An error occurred: ${err.message}`);
        else
            if (result.length) res.status(200).send(result[0]);
            else res.status(404).send('Movie not found');
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
            if (err === 'RECORD_NOT_FOUND') res.status(404).send(`Movie with id ${movieId} not found.`);
            else res.status(500).send('Error updating a movie');
        });
});

/**
 * Delete Movie by ID
 */
app.delete("/api/movies/:id", (req, res) => {
    const movieId = req.params.id;
    connection.query("DELETE FROM movies WHERE id = ?", [movieId], (err) => {
        if (err) res.status(500).send('😱 Error deleting a movie');
        else res.status(200).send('🎉 Movie deleted!');
    });
});

/**
 * Get Home 
 */
app.get("/", (req, res) => {
    console.log(req.session.user)
    res.send('Welcome to my favourite movie list');
});

/**
 * Server Listen
 */
app.listen(process.env.SERVER_PORT, () => {
    console.log(`✅  Server is running on ${process.env.SERVER_PORT}`);
});
