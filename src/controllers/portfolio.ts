import { FastifyInstance } from 'fastify';
import { Request, Reply } from '../types';
import * as brokers from '../services/brokers';
import * as positionsModel from '../models/positions';
import * as tradesModel from '../models/trades';

module.exports = function(fastify : FastifyInstance, opts, next) {
  fastify.route({
    url: '/trades/fetch',
    method: 'GET',
    schema: {
      querystring: {
        // Rewtrieve all trades, not just the latest.
        retrieve_all: { type: 'boolean' }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            data: { type: 'object', properties: tradesModel.schema.output },
          },
        },
      },
    },
    handler: async (req : Request, rep : Reply) => {
      let newTrades = await brokers.getTrades(req, req.query.retrieve_all);
      // Process and save them to DB (using a function in portfolio/trades.ts)


      rep.send({
        status:'ok',
        data: newTrades,
      });
    },
  });

  fastify.route({
    url: '/positions',
    method: 'GET',
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            data: { type: 'object', properties: positionsModel.schema.output }
          },
        },
      },
    },
    handler: async (req : Request, rep : Reply) => {
      let positions = await brokers.getPositions(req);
      rep.send({
        status: 'ok',
        data: positions,
      });
    },
  });

  next();
};
