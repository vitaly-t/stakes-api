import * as _ from 'lodash';
import * as db from '../services/db';
import * as debugMod from 'debug';
import { BaseLogger } from 'pino';
import { Request } from '../types';
import { OptionLeg, IOptionLeg } from './optionlegs';
import * as models from './models';

import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLNonNull,
  GraphQLInt,
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
} from '../graphql';

export interface ITrade {
  id: string;
  trade_id: string;
  user_id: string;
  position: string;
  broker_id: number;
  account: string;
  name?: string;
  strategy_description: string;
  tags: number[];
  note?: string;
  symbol: string;
  multiplier: number;
  combined_into?: string;
  traded: Date;
  added: Date;

  legs?: IOptionLeg[];
}

export const Trade = new GraphQLObjectType({
  name: 'Trade',
  sqlTable: 'trades',
  uniqueKey: 'id',
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    trade_id: { type: GraphQLString },
    user_id: { type: new GraphQLNonNull(GraphQLString) },
    position: { type: GraphQLString },
    account: { type: GraphQLString },
    name: { type: GraphQLString },
    strategy_description: { type: GraphQLString },
    tags: { type : new GraphQLList(GraphQLInt) },
    note: { type: GraphQLString },
    symbol: { type: new GraphQLNonNull(GraphQLString) },
    multiplier: { type: GraphQLInt },
    combined_into: { type: GraphQLString },
    traded: { type: GraphQLString },
    added: { type: GraphQLString },

    legs : {
      type: new GraphQLList(OptionLeg),
      sqlJoin(tradesTable, legsTable) {
        return `${tradesTable}.id = ${legsTable}.opening_trade`;
      },
    },
  },
});

const { accessors: preMadeAccessors } = models.makeAllData(Trade, 'trades');

export const accessors = {
  ...preMadeAccessors,
  combine(req : Request, trades : string[]) {
    if(trades.length === 1) {
      return null;
    }

    let args = {
      mainTrade: trades[0],
      subsumed: trades.slice(1),
    };

    let queries = [`UPDATE trades
      SET combined_into=$[mainTrade]
      WHERE id=ANY($[subsumed]);`,

      `UPDATE optionlegs SET opening_trade=$[mainTrade]
        WHERE opening_trade = ANY($[subsumed]);`,

      `UPDATE optionlegs SET closing_trade=$[mainTrade]
        WHERE closing_trade = ANY($[subsumed]);`,

      `WITH trade_risks AS (
        SELECT SUM(notional_risk) risk
        FROM trades
        WHERE id=$[mainTrade] OR id=ANY($[subsumed])
      )
      UPDATE trades
        SET notional_risk=risk
        FROM trade_risks
        WHERE id=$[mainTrade];`,
    ];

    req.log.debug(args, "Combining queries");
    return db.pg.tx(t => t.batch(_.map(queries, (q, i) => {
      return db.query(req.log, `combine trades:${i}`, q, args, t);
    })));
  },
};
