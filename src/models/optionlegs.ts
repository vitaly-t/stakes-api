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
  closing_trade: string;
  @Column({ readonly: true })
  orig_delta: number;
  @Column({ readonly: true })
  total_profit: number;
  @Column()
  expired: boolean;
}

const { accessors: preMadeAccessors, schema } = models.makeAllData(OptionLeg, 'optionlegs');
export { schema };

export const jsonObjectSyntax = _.map(
  models.schemaFieldListWithout(schema.output, 'user_id', 'symbol'),
  (v, k) => `'${k}', ol.${k}`
).join(', ');

export const accessors = {
  ...preMadeAccessors,
  split: (req : Request, id : string, splitOff: number) => {
    // Split an option leg into two legs, identical except for the size. This is done to facilitate
    // partial position closing.
    throw new Error("Not implemented");
  }
};