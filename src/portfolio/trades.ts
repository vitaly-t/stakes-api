import * as _ from 'lodash';
import * as db from '../services/db';
import * as uuid from 'uuid';
import { Request, Reply } from '../types';
import * as brokers from '../services/brokers';
import { IOptionLeg, accessors as legAccess } from '../models/optionlegs';
import { ITrade, accessors as tradeAccess } from '../models/trades';
import { IFetch, accessors as fetchAccess } from '../models/fetches';

export async function fetch(req : Request, retrieveAll : boolean) {
  let fetchLog = (await fetchAccess.add(req, { user_id: req.user.id, type: 'trades', status: 'running' }))[0];

  let numItems;
  fetchLog.status = 'success';
  try {
    let newTrades = await brokers.getTrades(req, req.query.retrieve_all);
    fetchLog.items_fetched = await process(req, newTrades);
    await fetchAccess.update(req, fetchLog);
  } catch(e) {
    fetchLog.status = 'failure';
    await fetchAccess.update(req, fetchLog);
  }


}

export async function process(req : Request, input : brokers.Trade[]) {

  let seenSymbols = new Set();
  let trades : ITrade[] = [];
  let newLegs: IOptionLeg[] = [];
  let updatedLegs : IOptionLeg[] = [];

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

    // TODO Get existing open legs and see if these trades close any of those legs.

    let thisExec : IOptionLeg[] = [];
    _.each(t.executions, (e) => {
      // Group executions by strike/expiration/right, and add to the legs list.
      let isCall = e.side === 'CALL' || e.side === 'C';
      let existing = _.find(thisExec, { strike: e.strike, call: isCall, expiration: e.expiration });
      if(existing)  {
        existing.size += e.size;
        existing.commissions += e.commissions;
        if(!_.isNil(e.realized_pnl) && !_.isNaN(e.realized_pnl)) {
          existing.total_profit += e.realized_pnl;
        }
      } else {
        thisExec.push({
          id: undefined,
          user_id: req.user.id,
          symbol: t.symbol,
          price: e.price,
          size: e.size,
          call: isCall,
          expiration: e.expiration,
          strike: e.strike,
          commissions: e.commissions,
          total_profit: e.realized_pnl,
          opening_trade: id,
        });
      }
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

  await Promise.all([
    legAccess.add(req, newLegs),
    legAccess.update(req, updatedLegs),
    tradeAccess.add(req, trades),
  ]);

  return trades.length;
}
