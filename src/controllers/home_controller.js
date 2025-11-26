const getHomepage = (req, res) => {
  res.render("../views/home.ejs");
};

const getAbc = (req, res) => {
  res.send("Hello from ABC");
};

const getDatas = (req, res) => {
  res.render("../views/data.ejs");
};
const getTempDashboard = (req, res) => {
  res.render("../views/temp_humi_dashboard.ejs");
};

const getAirDashboard = (req, res) => {
  res.render("../views/air_quality_dashboard.ejs");
};

const getSettings = (req, res) => {
  res.render("../views/setting.ejs");
};

const getLogin = (req, res) => {
  res.render("../views/login.ejs");
};

module.exports = {
  getHomepage,
  getAbc,
  getDatas,
  getTempDashboard,
  getAirDashboard,
  getSettings,
  getLogin,
};
