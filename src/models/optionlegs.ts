import * as models from '../common/models';
import * as _ from 'lodash';
import * as optionlegs from './optionlegs';
import * as db from '../services/db';
import { Request } from '../types';

const Column = models.Column;

export class OptionLeg {
  @Column({ readonly: true })
  id: string;
  @Column({ readonly: true })
  user_id: string;
  @Column({ required: true })
  symbol: string;
  @Column({ required: true })
  price: number;
  @Column({ required: true })
  size: number;
  @Column({ required: true })
  call: boolean;
  @Column({ required: true })
  expiration: Date;
  @Column({ required: true })
  strike: number;
  @Column({ required: true })
  commissions: number;
  @Column({ required: true })
  opening_trade: string;
  @Column()
  closing_trade?: string;
  @Column({ readonly: true })
  orig_delta: number;
  @Column({ readonly: true })
  total_profit?: number;
  @Column()
  expired: boolean;
}

export type IOptionLeg = models.I<OptionLeg>;

const { accessors: preMadeAccessors, schema } = models.makeAllData( OptionLeg, 'optionlegs');
export { schema };

export const jsonObjectSyntax = _.map(
  models.schemaFieldListWithout(schema.output, 'user_id', 'symbol'),
  (v, k) => `'${k}', ol.${k}`
).join(', ');

export const accessors = {
  ...preMadeAccessors,
  split: (req : Request, ids : string[], splitOff: number) => {
    // Split an option leg into two legs, identical except for the size. This is done to facilitate
    // partial position closing/rolling.
    return db.pg.tx(async (t) => {
      let orig = await db.queryTx(req.log, `split: reduce size`, t, `UPDATE optionlegs
        SET size = size - $[splitOff]
        WHERE ids=ANY($[id]) AND user_id=$[user_id]
        RETURNING *`, { ids, user_id: req.user.id }) as IOptionLeg[];

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
      }) as OptionLeg[];

      return preMadeAccessors.add(req, newLegs);
    });
  }
};