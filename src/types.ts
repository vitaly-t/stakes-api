import { FastifyRequest, FastifyReply } from 'fastify';

export interface Request extends FastifyRequest {
  user : {
    id: string;
  };
}

export type Reply = FastifyReply;

