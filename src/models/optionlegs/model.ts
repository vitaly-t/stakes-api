import * as _ from 'lodash';
import * as db from '../../services/db';
import * as debugMod from 'debug';
import { BaseLogger } from 'pino';
import { Request } from '../../types';
import * as models from '../models';

import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLNonNull,
  GraphQLInt,
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
} from '../../graphql_types';

export interface IOptionLeg {
  id: string;
  user_id: string;
  symbol: string;
  price: number;
  size: number;
  call: boolean;
  expiration: string;
  strike: number;
  commissions: number;
  expired: number;
  opening_trade: string;
  closing_trade: string;
  orig_delta: number;
  total_profit: number;
}

export const OptionLeg = new GraphQLObjectType({
  name: 'OptionLeg',
  sqlTable: 'optionlegs',
  uniqueKey: 'id',
  fields: {
    id: { type: GraphQLID },
    user_id: { type: GraphQLString },
    symbol: { type: new GraphQLNonNull(GraphQLString) },
    price: { type: GraphQLFloat },
    size: { type: GraphQLInt },
    call: { type: GraphQLBoolean },
    expiration: { type: GraphQLString },
    strike: { type: GraphQLFloat },
    commissions: { type: GraphQLFloat },
    expired: { type: GraphQLBoolean },
    opening_trade: { type: GraphQLString },
    closing_trade: { type: GraphQLString },
    orig_delta: { type: GraphQLFloat },
    total_profit: { type: GraphQLFloat },
  },
});

const { accessors: preMadeAccessors } = models.makeAllData( OptionLeg, 'optionlegs');

export const accessors = {
  ...preMadeAccessors,
  split: (req : Request, ids : string[], splitOff: number) => {
    // Split an option leg into two legs, identical except for the size. This is done to facilitate
    // partial position closing/rolling.
    return db.pg.tx(async (t) => {
      let orig = await db.query(req.log, `split: reduce size`, `UPDATE optionlegs
        SET size = size - $[splitOff]
        WHERE ids=ANY($[id]) AND user_id=$[user_id]
        RETURNING *`, { ids, user_id: req.user.id }, t);

      if(orig.length !== ids.length) {
        throw new Error("Didn't find all requested legs");
      }

      let newLegs = _.map(orig, (o) => {
        if(o.size <= 0) {
          throw new Error(`Can't split ${splitOff} from leg ${o.id} of size ${o.size}`);
        }

        o.id = undefined;
        o.size = splitOff;
        return o;
      });

      return preMadeAccessors.add(req, newLegs);
    });
  }
};