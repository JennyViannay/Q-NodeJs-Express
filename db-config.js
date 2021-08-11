const mysql = require('mysql2')
const dotenv = require('dotenv');
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
        console.log(`✅ -- MySql is connected to ${process.env.DB_NAME} database, port ${process.env.DB_PORT} --`);
    } else {
        console.log("👎 -- Error connecting MySql : -- ", err);
    }
});

module.exports = connection;