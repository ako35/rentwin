const app = require("./app");

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Pick & Drive backend listening on port ${PORT}`);
});
