require ("dotenv").config();    
require ("./service/mqtt_sub");
const express = require("express");
const configViewEngine = require ("./config/view_engine")
const webRoutes = require ("./routes/web");
const apiRoutes = require ("./routes/api");

const app = express();
const port = process.env.PORT   || 8888;
const host_name = process.env.HOST_NAME;

// Config template engine
configViewEngine(app);                                                              

// Json type
app.use (express.json());

// Routes
app.use ("/", webRoutes);
app.use ("/api", apiRoutes);

// Start the server
app.listen(port, host_name, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});
