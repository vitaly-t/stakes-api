import * as _ from 'lodash';
import * as db from '../services/db';
import * as uuid from 'uuid';
import { Request, Reply } from '../types';
import * as brokers from '../services/brokers';
import { IOptionLeg } from '../models/optionlegs';
import { ITrade } from '../models/trades';

export async function fetch(req : Request, retrieveAll : boolean) {
  let newTrades = await brokers.getTrades(req, req.query.retrieve_all);

  return process(req, newTrades);
}

export async function process(req : Request, input : brokers.Trade[]) {

  let seenSymbols = new Set();
  let trades : ITrade[] = [];
  let legs : IOptionLeg[] = [];

  let importDate = new Date();

  _.each(input, (t) => {
    let id = uuid.v1();
    let trade : ITrade = {
      id: id,
      user_id: req.user.id,
      trade_id: t.id,
      symbol: t.symbol,
      traded: new Date(t.time),
      multiplier: null, // TODO fill this in
      tags: null,
      strategy_description: null, // TODO Calculate this from the executions.
      account: null, // Get this from the table of accounts
      position: null, // Fill this in at the end
      broker_id: null, // get this from the table of broker ids
      added: importDate,
    };

    seenSymbols.add(t.symbol);

    _.each(t.executions, (e) => {
      // Group executions by strike/expiration/right, and add to the legs list.
    });
  });

  // Get the positions for all the symbols that we saw and then fill in the trades with the
  // matching position ID.
  let positionList = await db.query(req.log, 'position lookup',
    `SELECT id, symbol FROM positions
     WHERE user_id=$[user_id] AND symbol=ANY$[symbols]
     ORDER BY active DESC, added DESC`,
     { user_id: req.user.id, symbols: Array.from(seenSymbols) });

  let positions = _.transform(positionList, (memo, row) => {
    if(!memo[row.symbol]) {
      memo[row.symbol] = row.id;
    }
  }, {} as {[key:string]: string});

  _.each(trades, (t) => {
    t.position = positions[t.symbol];
  });



}