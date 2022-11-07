import { ApolloServerPluginDrainHttpServer } from "apollo-server-core";
import { ApolloServer } from "apollo-server-fastify";
import { buildSchema } from "type-graphql";
import fastify, {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import UserResolver from "../modules/user/user.resolver";
import { execute, GraphQLSchema, subscribe } from "graphql";
import { ApolloServerPlugin } from "apollo-server-plugin-base";
import { SubscriptionServer } from "subscriptions-transport-ws";
import fastifyCors from "@fastify/cors";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import { User } from "../modules/user/user.dto";
import { bearerAuthChecker } from "./bearerAuthChecker";
import MessageResolver from "../modules/message/message.resolver";

const app = fastify();

app.register(fastifyJwt, {
  secret: "change-me",
  cookie: {
    cookieName: "token",
    signed: false,
  },
});

app.register(fastifyCors, {
  credentials: true,
  origin: (origin, cb) => {
    console.log(origin);
    if (
      !origin ||
      ["http://localhost:4000", "https://studio.apollographql.com"].includes(
        origin
      )
    ) {
      return cb(null, true);
    }
    return cb(new Error("Not allowed"), false);
  },
});

app.register(fastifyCookie, {
  parseOptions: {},
});

type CtxUser = Omit<User, "password">;

async function buildContext({
  request,
  reply,
  connectionParams,
}: {
  request?: FastifyRequest;
  reply?: FastifyReply;
  connectionParams: {
    Authorization: string;
  };
}) {
  if (connectionParams || !request) {
    try {
      return {
        user: await app.jwt.verify<CtxUser>(
          connectionParams.Authorization || ""
        ),
      };
    } catch (error) {
      return { user: null };
    }
  }
  try {
    const user = await request.jwtVerify<CtxUser>();
    return { request, reply, user };
  } catch (error) {
    return { request, reply, user: null };
  }
}

export type Context = Awaited<ReturnType<typeof buildContext>>;

function fastifyAppClosePlugin(app: FastifyInstance): ApolloServerPlugin {
  return {
    async serverWillStart() {
      return {
        async drainServer() {
          await app.close();
        },
      };
    },
  };
}

export async function createServer() {
  const schema = await buildSchema({
    resolvers: [UserResolver, MessageResolver],
    authChecker: bearerAuthChecker,
  });

  const server = new ApolloServer({
    schema,
    plugins: [
      fastifyAppClosePlugin(app),
      ApolloServerPluginDrainHttpServer({
        httpServer: app.server,
      }),
    ],
    context: buildContext,
  });

  subscriptionServer({ schema, server: app.server });

  return { app, server };
}
const subscriptionServer = ({
  schema,
  server,
}: {
  schema: GraphQLSchema;
  server: typeof app.server;
}) => {
  return SubscriptionServer.create(
    {
      schema,
      execute,
      subscribe,
      async onConnect(connectionParams: { Authorization: string }) {
        return buildContext({ connectionParams });
      },
    },
    {
      server,
      path: "/graphql",
    }
  );
};
