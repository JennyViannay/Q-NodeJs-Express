const express = require('express');
const dotenv = require('dotenv');
const mysql = require('mysql')
const movies = require("./movies");

dotenv.config(process.cwd(), '.env');

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    port : process.env.DB_PORT, 
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
}) 

connection.connect((err) => {
    if (!err) {
        console.log(`✅ -- MySql is connected to ${process.env.DB_NAME} database, port ${process.env.DB_PORT} -- ✅ `);
    } else {
        console.log("-- 👎 -- Error connecting MySql : -- 👎 -- ", err);
    }
});

const app = express();

app.get("/api/movies", (request, response) => {
    response.status(200).json(movies);
});

app.get("/api/users", (request, response) => {
    response.status(403).send('Access denied');
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
    console.log(`Server is running on ${process.env.SERVER_PORT}`);
});
