import Server from "@generated/server"
Server.listen({ port: 4000 }, () =>
    console.log("🚀 Server ready at http://localhost:4000"),
)