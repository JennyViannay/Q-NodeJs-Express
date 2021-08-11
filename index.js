const express = require('express');
const bodyParser = require('body-parser');
const connection = require("./db-config");
const app = express();

app.use(express.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.get("/api/movies", (request, response) => {
    connection.query('SELECT * FROM movies', (err, result) => {
        if (err) {
            response.status(500).send('Error retrieving data from database');
        } else {
            response.status(200).json(result);
        }
    });
});

app.post('/api/movies', (req, res) => {
    console.log(req.body)
    const { title, director, year, color, duration } = req.body;
    connection.query(
        'INSERT INTO movies (title, director, year, color, duration) VALUES (?, ?, ?, ?, ?)',
        [title, director, year, color, duration],
        (err, result) => {
            if (err) {
                console.log(err)
                res.status(500).send('Error saving the movie');
            } else {
                res.status(201).send('Movie successfully saved');
            }
        }
    );
});

app.put("/api/movies/:id", (req, res) => {
    const movieId = req.params.id;
    const moviePropsToUpdate = req.body;
    console.log(movieId);
    connection.query(
        'UPDATE movies SET ? WHERE id = ?',
        [moviePropsToUpdate, movieId],
        (err) => {
          if (err) {
            console.log(err);
            res.status(500).send('Error updating a movie');
          } else {
            res.status(200).send('Movie updated successfully 🎉');
          }
        }
    );
});

app.get("/api/users", (request, response) => {
    response.status(403).send('Access denied');
});

app.post('/api/users', (req, res) => {
    console.log(req.body)
    const { firstname, lastname } = req.body;
    connection.query(
        'INSERT INTO user (firstname, lastname) VALUES (?, ?)',
        [firstname, lastname],
        (err, result) => {
            if (err) {
                console.log(err)
                res.status(500).send('Error saving the user');
            } else {
                res.status(201).send('User successfully saved');
            }
        }
    );
});

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
            res.status(200).send('User updated successfully 🎉');
          }
        }
    );
});

app.get("/api/movies/:id", (request, response) => {
    const movie = movies.find(movie => movie.id == request.params.id)
    if (movie) {
        response.send(movie);
    } else {
        response.send(`Sorry, movie with ref number ${request.params.id} not found...`);
    }
});

app.get("/api/search", (request, response) => {
    const results = [];
    if (request.query.maxDuration > 100) {
        movies.forEach(movie => {
            if (movie.duration < request.query.maxDuration) {
                results.push(movie)
            }
        });
        response.status(200).json(results)
    }
    if (request.query.maxDuration < 100) {
        response.send(`No movie for this duration`);
    } else {
        response.send(`Please enter a maxDuration`);
    }
});

app.get("/", (request, response) => {
    response.send("Welcome to my favourite movie list");
});

app.listen(process.env.SERVER_PORT, () => {
    console.log(`✅  Server is running on ${process.env.SERVER_PORT}`);
});
