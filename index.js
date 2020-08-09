const { ApolloServer } = require("apollo-server");
const typeDefs = require("./db/schema.graphql");
const resolvers = require("./db/resolvers");
const conectarBD = require("./config/db");
const jwt = require("jsonwebtoken");
require("dotenv").config({ path: "variables.env" });

conectarBD();

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    // console.log(req.headers["authorization"]);
    const token = req.headers["authorization"] || "";
    if (token) {
      try {
        const usuario = jwt.verify(
          token.replace("Bearer  ", ""),
          process.env.SECRETA
        );
        return {
          usuario,
        };
      } catch (error) {
        console.log("error", error);
      }
    }
  },
});

server.listen({ port: process.env.PORT || 4000 }).then(({ url }) => {
  console.log(`Server corriendo en ${url}`);
});
