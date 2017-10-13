import * as _ from 'lodash';
import * as db from '../services/db';
import * as debugMod from 'debug';
import { BaseLogger } from 'pino';
import { Request } from '../types';
import * as models from './models';

import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLNonNull,
  GraphQLInt,
  GraphQLBoolean,
  GraphQLFloat,
} from '../graphql';

export interface IBroker {
  id : string;
  email : string;
  name : string;
  pw_hash? : string;
  info: {[key: string]: any};
}

export const Broker = new GraphQLObjectType({
  name: 'Broker',
  sqlTable: 'brokers',
  uniqueKey: 'id',
  fields: () => ({
    id: { type: GraphQLInt },
    short_name: { type: GraphQLString },
    long_name:  { type: GraphQLString },
  }),
});

export const rootQueryFields = {
  brokers: {
    type: Broker,
  },
};

const preMadeAccessors = models.makeAccessors(Broker, 'brokers', ['id']);

export const accessors = {
  ...preMadeAccessors,
};
