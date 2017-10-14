import * as fastifyMod from 'fastify';
import * as config from './config';
import * as fastifyApollo from 'fastify-apollo';
import { Request, Reply } from './types';
import schema from './models/schema';

const fastify = fastifyMod({
  logger: {
    level: 'info',
    prettyPrint: config.dev,
  },
});

fastify.register(fastifyApollo, {
  graphql: (req : Request, rep: Reply) => {
    return {
      schema,
      context: {
        user: { id: 'e1bc5ec0-b08f-11e7-b258-0bc36fa3d63a' }, // hardcoded for now.
        req,
        rep,
      },
    }
  },
  graphiql: true,
} as any);

fastify.listen(config.bind.port, config.bind.host, function(err) {
  if(err) {
    throw err;
  }
  console.log(`Listening on ${fastify.server.address()}`);
});
