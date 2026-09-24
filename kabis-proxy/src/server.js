const app = require("./app");

const PORT = process.env.PORT || 4100;

app.listen(PORT, () => {
  console.log(`Rentwin KABİS proxy listening on port ${PORT}`);
});
