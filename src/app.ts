import 'reflect-metadata';
import * as fastifyMod from 'fastify';
import * as config from './config';
import * as fastifyApollo from 'fastify-apollo';
import schema from './models/schema';

const fastify = fastifyMod({
  logger: {
    level: 'info',
    prettyPrint: config.dev,
  },
});

fastify.register(fastifyApollo, {
  graphql: () => ({
    schema,
    context: {
      user: { id: 1 } // hardcoded for now.
    }
  }),
  graphiql: true
} as any);

fastify.listen(config.bind.port, config.bind.host, function(err) {
  if(err) {
    throw err;
  }
  console.log(`Listening on ${fastify.server.address()}`);
});