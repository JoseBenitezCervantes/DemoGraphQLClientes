const mongoose = require("mongoose");
require("dotenv").config({ path: "variables.env" });

const conectarBD = async () => {
  try {
    await mongoose.connect(process.env.DB_MONGO, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
      useCreateIndex: true,
    });
    console.log("DB CONECTADA");
  } catch (error) {
    console.log("conectarBD -> error", error);
    process.exit(1);
  }
};

module.exports = conectarBD;
