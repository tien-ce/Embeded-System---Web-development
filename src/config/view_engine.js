const path = require ("path");
const express = require("express");
const configViewEngine = (app) => {
    console.log (">>> Check __dirname: ", __dirname);
    // Template engine
    app.set ("views", path.join(__dirname,"../views"));
    app.set ("view engine", "ejs");
    app.set ("views", path.join(__dirname,"../views"));

    // Static file
    app.use(express.static(path.join(__dirname,"../public")));
};
module.exports = configViewEngine;