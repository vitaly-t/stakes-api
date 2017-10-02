import * as fastifyMod from 'fastify';
import * as config from './config';

const fastify = fastifyMod({
  logger: {
    level: 'info',
    prettyPrint: config.dev,
  },
});

fastify.register([
  require('./controllers/portfolio'),
  require('./controllers/quotes'),
]);

fastify.listen(config.bind.port, config.bind.host, function(err) {
  if(err) {
    throw err;
  }
  console.log(`Listening on ${fastify.server.address()}`);
});